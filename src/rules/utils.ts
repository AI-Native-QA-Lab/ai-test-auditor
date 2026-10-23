import * as ts from 'typescript';
import { visitExecutableNodes } from './ast-traversal.js';
import {
  isNodeComparisonMethod,
  nodeAssertionName,
} from '../core/native-assertions.js';
import { isShadowedAtNode } from '../core/scope-analysis.js';
import type {
  Classification,
  Confidence,
  Finding,
  Framework,
  NativeAssertionBinding,
  Severity,
  TestCase,
} from '../core/types.js';

export interface Assertion {
  readonly matcher: ts.CallExpression;
  readonly expected: ts.Expression | undefined;
  readonly actual: ts.Expression;
  readonly matcherName: string;
  readonly isNegated: boolean;
  readonly isPolled: boolean;
  readonly pollResultKnown: boolean;
  readonly hasPromiseModifier: boolean;
}

interface ExpectFactoryCall {
  readonly actual: ts.Expression | undefined;
  readonly isPolled: boolean;
  readonly pollResultKnown: boolean;
}

export function sourceFileFor(testCase: TestCase): ts.SourceFile {
  const source = testCase.analysisContext?.source ?? testCase.source;
  const scriptKind = testCase.filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : testCase.filePath.endsWith('.js')
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;

  return ts.createSourceFile(
    testCase.filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
}

export function lineFor(testCase: TestCase, node: ts.Node): number {
  const sourceFile = node.getSourceFile();
  if (testCase.analysisContext) {
    const position = ts.isSourceFile(node)
      ? testCase.analysisContext.callbackStart
      : node.getStart(sourceFile);
    return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
  }
  return (
    testCase.line +
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line
  );
}

export function isExpectReference(
  expression: ts.Expression,
  expectBindings?: readonly string[],
): boolean {
  if (!ts.isIdentifier(expression)) return false;
  const localName = expression.text;
  return (
    (expectBindings === undefined
      ? localName === 'expect'
      : expectBindings.includes(localName)) &&
    !isShadowedAtNode(expression, localName)
  );
}

export function expectCalls(
  sourceFile: ts.SourceFile,
  expectBindings?: readonly string[],
  framework?: Framework,
  rootCallbackStart?: number,
): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];

  visitExecutableNodes(
    sourceFile,
    (node) => {
      if (
        ts.isCallExpression(node) &&
        expectFactoryCall(node, expectBindings, framework)
      ) {
        calls.push(node);
      }
    },
    { expectBindings, framework, rootCallbackStart },
  );

  return calls;
}

export function nativeAssertionCalls(
  sourceFile: ts.SourceFile,
  framework: Framework = 'unknown',
  bindings: readonly NativeAssertionBinding[] = [],
  rootCallbackStart?: number,
): ts.CallExpression[] {
  if (framework !== 'node-test') return [];

  const calls: ts.CallExpression[] = [];
  visitExecutableNodes(
    sourceFile,
    (node) => {
      if (!ts.isCallExpression(node)) return;
      if (nodeAssertionName(node, bindings)) calls.push(node);
    },
    { framework, rootCallbackStart },
  );
  return calls;
}

export function bareExpectCalls(
  sourceFile: ts.SourceFile,
  expectBindings?: readonly string[],
  framework?: Framework,
  rootCallbackStart?: number,
): ts.CallExpression[] {
  return expectCalls(
    sourceFile,
    expectBindings,
    framework,
    rootCallbackStart,
  ).filter((call) => {
    const parent = call.parent;
    return !(
      ts.isPropertyAccessExpression(parent) && parent.expression === call
    );
  });
}

export function assertionCountGuards(
  sourceFile: ts.SourceFile,
  expectBindings?: readonly string[],
  rootCallbackStart?: number,
): ts.CallExpression[] {
  const guards: ts.CallExpression[] = [];
  visitExecutableNodes(
    sourceFile,
    (node) => {
      if (
        !ts.isCallExpression(node) ||
        !ts.isPropertyAccessExpression(node.expression) ||
        !isExpectReference(node.expression.expression, expectBindings)
      ) {
        return;
      }

      if (
        node.expression.name.text === 'assertions' ||
        node.expression.name.text === 'hasAssertions'
      ) {
        guards.push(node);
      }
    },
    { expectBindings, rootCallbackStart },
  );
  return guards;
}

export function assertions(
  sourceFile: ts.SourceFile,
  framework: Framework = 'unknown',
  bindings: readonly NativeAssertionBinding[] = [],
  expectBindings?: readonly string[],
  rootCallbackStart?: number,
): Assertion[] {
  const found: Assertion[] = [];

  visitExecutableNodes(
    sourceFile,
    (node) => {
      if (
        !ts.isCallExpression(node) ||
        !ts.isPropertyAccessExpression(node.expression)
      ) {
        return;
      }

      const assertion = expectAssertionForMatcher(
        node,
        expectBindings,
        framework,
      );
      if (assertion) found.push(assertion);
    },
    { expectBindings, framework, rootCallbackStart },
  );

  for (const matcher of nativeAssertionCalls(
    sourceFile,
    framework,
    bindings,
    rootCallbackStart,
  )) {
    const matcherName = nodeAssertionName(matcher, bindings);
    if (!matcherName) continue;

    if (
      ['assert', 'ok'].includes(matcherName) &&
      matcher.arguments.length === 1
    ) {
      found.push({
        matcher,
        expected: undefined,
        actual: matcher.arguments[0]!,
        matcherName,
        isNegated: false,
        isPolled: false,
        pollResultKnown: false,
        hasPromiseModifier: false,
      });
      continue;
    }

    if (!isNodeComparisonMethod(matcherName)) continue;

    const actual = matcher.arguments[0];
    const expected = matcher.arguments[1];
    if (!actual || !expected) continue;

    found.push({
      matcher,
      expected,
      actual,
      matcherName,
      isNegated: false,
      isPolled: false,
      pollResultKnown: false,
      hasPromiseModifier: false,
    });
  }

  return found;
}

export function hasOnlyZeroArgumentMatchers(
  sourceFile: ts.SourceFile,
  matcherNames: readonly string[],
  actualMatches: (actual: ts.Expression) => boolean = () => true,
  framework?: Framework,
  bindings?: readonly NativeAssertionBinding[],
  expectBindings?: readonly string[],
  rootCallbackStart?: number,
): boolean {
  const direct = [
    ...expectCalls(sourceFile, expectBindings, framework, rootCallbackStart),
    ...nativeAssertionCalls(sourceFile, framework, bindings, rootCallbackStart),
  ];
  const found = assertions(
    sourceFile,
    framework,
    bindings,
    expectBindings,
    rootCallbackStart,
  );
  return (
    direct.length > 0 &&
    direct.length === found.length &&
    found.every(
      (assertion) =>
        !assertion.isNegated &&
        matcherNames.includes(assertion.matcherName) &&
        (['assert', 'ok'].includes(assertion.matcherName)
          ? assertion.matcher.arguments.length === 1
          : assertion.matcher.arguments.length === 0) &&
        actualMatches(assertion.actual),
    )
  );
}

export function hasOnlyMatchers(
  sourceFile: ts.SourceFile,
  matcherNames: readonly string[],
  framework?: Framework,
  bindings?: readonly NativeAssertionBinding[],
  expectBindings?: readonly string[],
  rootCallbackStart?: number,
): boolean {
  const direct = [
    ...expectCalls(sourceFile, expectBindings, framework, rootCallbackStart),
    ...nativeAssertionCalls(sourceFile, framework, bindings, rootCallbackStart),
  ];
  const found = assertions(
    sourceFile,
    framework,
    bindings,
    expectBindings,
    rootCallbackStart,
  );
  return (
    direct.length > 0 &&
    direct.length === found.length &&
    found.every((assertion) => matcherNames.includes(assertion.matcherName))
  );
}

export function hasRecognizedAssertionCall(
  root: ts.Node,
  framework: Framework,
  bindings: readonly NativeAssertionBinding[] = [],
  expectBindings?: readonly string[],
): boolean {
  return hasRecognizedCallInUncertainCallbacks(
    root,
    framework,
    expectBindings,
    (node) =>
      ts.isCallExpression(node) &&
      (Boolean(expectFactoryCall(node, expectBindings, framework)) ||
        (framework === 'node-test' &&
          Boolean(nodeAssertionName(node, bindings)))),
  );
}

export function hasRecognizedMatcherAssertion(
  root: ts.Node,
  framework: Framework,
  expectBindings?: readonly string[],
): boolean {
  return hasRecognizedCallInUncertainCallbacks(
    root,
    framework,
    expectBindings,
    (node) =>
      ts.isCallExpression(node) &&
      Boolean(expectAssertionForMatcher(node, expectBindings, framework)),
  );
}

function hasRecognizedCallInUncertainCallbacks(
  root: ts.Node,
  framework: Framework,
  expectBindings: readonly string[] | undefined,
  isRecognized: (node: ts.Node) => boolean,
): boolean {
  const pending = [root];
  const visited = new Set<ts.Node>();

  while (pending.length > 0) {
    const callback = pending.pop()!;
    if (visited.has(callback)) continue;
    visited.add(callback);

    let found = false;
    const uncertainCallbacks = visitExecutableNodes(
      callback,
      (node) => {
        if (isRecognized(node)) found = true;
      },
      { expectBindings, framework },
    );
    if (found) return true;
    pending.push(...uncertainCallbacks);
  }

  return false;
}

export function expectAssertionForMatcher(
  matcher: ts.CallExpression,
  expectBindings?: readonly string[],
  framework: Framework = 'unknown',
): Assertion | undefined {
  if (!ts.isPropertyAccessExpression(matcher.expression)) return undefined;

  let expression = matcher.expression.expression;
  let isNegated = false;
  let hasPromiseModifier = false;
  while (ts.isPropertyAccessExpression(expression)) {
    if (expression.name.text === 'not') {
      isNegated = true;
    } else if (
      expression.name.text === 'resolves' ||
      expression.name.text === 'rejects'
    ) {
      hasPromiseModifier = true;
    } else {
      return undefined;
    }
    expression = expression.expression;
  }

  if (!ts.isCallExpression(expression)) return undefined;
  const factory = expectFactoryCall(expression, expectBindings, framework);
  if (!factory || !factory.actual) return undefined;

  return {
    matcher,
    expected: matcher.arguments[0],
    actual: factory.actual,
    matcherName: matcher.expression.name.text,
    isNegated,
    isPolled: factory.isPolled,
    pollResultKnown: factory.pollResultKnown,
    hasPromiseModifier,
  };
}

function expectFactoryCall(
  call: ts.CallExpression,
  expectBindings: readonly string[] | undefined,
  framework: Framework | undefined,
): ExpectFactoryCall | undefined {
  const actual = call.arguments[0];
  if (isExpectReference(call.expression, expectBindings)) {
    return { actual, isPolled: false, pollResultKnown: false };
  }

  if (framework !== 'vitest' && framework !== 'playwright') return undefined;
  let callee = call.expression;
  let isExpectFactory = false;
  let isPolled = false;
  while (ts.isPropertyAccessExpression(callee)) {
    if (callee.name.text === 'soft' || callee.name.text === 'poll') {
      isExpectFactory = true;
      if (callee.name.text === 'poll') isPolled = true;
      callee = callee.expression;
    } else {
      return undefined;
    }
  }

  if (!isExpectFactory || !isExpectReference(callee, expectBindings)) {
    return undefined;
  }

  const pollResult =
    isPolled && actual ? pollingResultExpression(actual) : undefined;
  return {
    actual: pollResult?.expression ?? actual,
    isPolled,
    pollResultKnown: pollResult !== undefined,
  };
}

function pollingResultExpression(
  callback: ts.Expression,
): { readonly expression: ts.Expression } | undefined {
  if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) {
    return undefined;
  }
  if (!ts.isBlock(callback.body)) return { expression: callback.body };
  if (
    callback.body.statements.length === 1 &&
    ts.isReturnStatement(callback.body.statements[0]!) &&
    callback.body.statements[0]!.expression
  ) {
    return { expression: callback.body.statements[0]!.expression };
  }
  return undefined;
}

export function isSimpleLiteral(expression: ts.Expression): boolean {
  return (
    ts.isStringLiteralLike(expression) ||
    ts.isNumericLiteral(expression) ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.NullKeyword
  );
}

export function literalKey(expression: ts.Expression): string {
  if (ts.isStringLiteralLike(expression)) return `string:${expression.text}`;
  return `${expression.kind}:${expression.getText()}`;
}

export function structuralText(expression: ts.Expression): string {
  return ts
    .createPrinter({ removeComments: true })
    .printNode(ts.EmitHint.Expression, expression, expression.getSourceFile());
}

export function structurallyIdenticalArguments(
  actual: readonly ts.Expression[],
  expected: readonly ts.Expression[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every(
      (argument, index) =>
        structuralText(argument) === structuralText(expected[index]!),
    )
  );
}

export function isUnitTest(testCase: TestCase): boolean {
  return (
    testCase.type === 'unit' ||
    (testCase.type === 'unknown' && testCase.framework !== 'playwright')
  );
}

export function finding(
  testCase: TestCase,
  node: ts.Node,
  ruleId: string,
  classification: Classification,
  severity: Severity,
  confidence: Confidence,
  message: string,
  remediation: string,
): Finding {
  return {
    ruleId,
    classification,
    severity,
    confidence,
    filePath: testCase.filePath,
    line: lineFor(testCase, node),
    message,
    remediation,
  };
}
