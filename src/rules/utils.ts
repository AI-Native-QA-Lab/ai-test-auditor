import * as ts from 'typescript';
import type {
  Classification,
  Confidence,
  Finding,
  Severity,
  TestCase,
} from '../core/types.js';

export interface Assertion {
  readonly matcher: ts.CallExpression;
  readonly expected: ts.Expression;
  readonly actual: ts.Expression;
  readonly matcherName: string;
}

export function sourceFileFor(testCase: TestCase): ts.SourceFile {
  const scriptKind = testCase.filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : testCase.filePath.endsWith('.js')
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;

  return ts.createSourceFile(
    testCase.filePath,
    testCase.source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
}

export function visitNodes(
  sourceFile: ts.SourceFile,
  predicate: (node: ts.Node) => void,
): void {
  function visit(node: ts.Node): void {
    predicate(node);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

export function lineFor(testCase: TestCase, node: ts.Node): number {
  const sourceFile = node.getSourceFile();
  return (
    testCase.line +
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line
  );
}

export function expectCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];

  visitNodes(sourceFile, (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'expect'
    ) {
      calls.push(node);
    }
  });

  return calls;
}

export function assertions(sourceFile: ts.SourceFile): Assertion[] {
  const found: Assertion[] = [];

  visitNodes(sourceFile, (node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isPropertyAccessExpression(node.expression)
    ) {
      return;
    }

    const expected = node.expression.expression;
    if (
      !ts.isCallExpression(expected) ||
      !ts.isIdentifier(expected.expression) ||
      expected.expression.text !== 'expect'
    ) {
      return;
    }

    const actual = expected.arguments[0];
    if (!actual) return;

    found.push({
      matcher: node,
      expected,
      actual,
      matcherName: node.expression.name.text,
    });
  });

  return found;
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
