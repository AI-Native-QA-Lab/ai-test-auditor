import * as ts from 'typescript';
import { visitExecutableNodes } from './ast-traversal.js';
import type { Finding, TestCase } from '../core/types.js';
import {
  assertions,
  assertionCountGuards,
  bareExpectCalls,
  expectCalls,
  hasOnlyMatchers,
  hasOnlyZeroArgumentMatchers,
  hasImportedAssertionLikeCall,
  hasRecognizedAssertionCall,
  finding,
  isSimpleLiteral,
  isExpectReference,
  isUnitTest,
  literalKey,
  nativeAssertionCalls,
  sourceFileFor,
  structuralText,
  structurallyIdenticalArguments,
} from './utils.js';

const fakeMessage = (detail: string): string =>
  `${detail} Static analysis inspects source syntax only and cannot prove runtime behavior.`;

const fakeRemediation = (detail: string): string =>
  `${detail} Static analysis cannot determine whether the revised assertion covers every behavior path.`;

export function evaluateUnitRules(testCase: TestCase): Finding[] {
  if (!isUnitTest(testCase)) return [];

  const sourceFile = sourceFileFor(testCase);
  const findings: Finding[] = [];
  const nativeBindings = testCase.nativeAssertionBindings ?? [];
  const expectBindings = testCase.expectBindings;
  const rootCallbackStart = testCase.analysisContext?.callbackStart;
  const testAssertions = assertions(
    sourceFile,
    testCase.framework,
    nativeBindings,
    expectBindings,
    rootCallbackStart,
  );

  if (
    expectCalls(
      sourceFile,
      expectBindings,
      testCase.framework,
      rootCallbackStart,
    ).length === 0 &&
    nativeAssertionCalls(
      sourceFile,
      testCase.framework,
      nativeBindings,
      rootCallbackStart,
    ).length === 0
  ) {
    const possibleAssertion =
      visitExecutableNodes(sourceFile, () => {}, {
        expectBindings,
        framework: testCase.framework,
        rootCallbackStart,
      }).some((callback) =>
        hasRecognizedAssertionCall(
          callback,
          testCase.framework,
          nativeBindings,
          expectBindings,
        ),
      ) ||
      hasImportedAssertionLikeCall(
        sourceFile,
        testCase.framework,
        expectBindings,
        rootCallbackStart,
      );
    findings.push(
      finding(
        testCase,
        sourceFile,
        'UT001',
        possibleAssertion ? 'WEAK' : 'FAKE',
        possibleAssertion ? 'WARNING' : 'CRITICAL',
        possibleAssertion ? 'MEDIUM' : 'HIGH',
        possibleAssertion
          ? 'UT001 found assertion-like evidence only inside an opaque callback or imported helper whose behavior cannot be verified locally.'
          : fakeMessage(
              'UT001 found no recognized expect or Node native assert call in this test.',
            ),
        possibleAssertion
          ? 'Make callback invocation explicit or review the imported helper implementation; static analysis cannot establish whether opaque callbacks run or helpers assert.'
          : fakeRemediation(
              'Add an assertion for an observable behavior or side effect.',
            ),
      ),
    );
  }

  const bareExpect = bareExpectCalls(
    sourceFile,
    expectBindings,
    testCase.framework,
    rootCallbackStart,
  )[0];
  if (bareExpect) {
    findings.push(
      finding(
        testCase,
        bareExpect,
        'UT012',
        'FAKE',
        'CRITICAL',
        'HIGH',
        fakeMessage('UT012 calls expect without a matcher assertion.'),
        fakeRemediation(
          'Use a matcher that compares an observed value with an independently derived expectation.',
        ),
      ),
    );
  }

  const zeroAssertionGuard = assertionCountGuards(
    sourceFile,
    expectBindings,
    rootCallbackStart,
  ).find(
    (guard) =>
      ts.isPropertyAccessExpression(guard.expression) &&
      isExpectReference(guard.expression.expression, expectBindings) &&
      guard.expression.name.text === 'assertions' &&
      guard.arguments.length === 1 &&
      guard.arguments[0]?.kind === ts.SyntaxKind.NumericLiteral &&
      guard.arguments[0].getText() === '0',
  );
  if (zeroAssertionGuard && testAssertions.length > 0) {
    findings.push(
      finding(
        testCase,
        zeroAssertionGuard,
        'UT013',
        'FAKE',
        'CRITICAL',
        'HIGH',
        fakeMessage(
          'UT013 declares zero expected assertions while also containing a matcher assertion.',
        ),
        fakeRemediation(
          'Set the assertion count to the actual number of assertions or remove the contradictory guard.',
        ),
      ),
    );
  }

  if (
    hasOnlyMatchers(
      sourceFile,
      [
        'toHaveBeenCalled',
        'toHaveBeenCalledTimes',
        'toHaveBeenCalledWith',
        'toHaveBeenLastCalledWith',
        'toHaveBeenNthCalledWith',
      ],
      testCase.framework,
      nativeBindings,
      expectBindings,
      rootCallbackStart,
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'UT014',
        'WEAK',
        'WARNING',
        'HIGH',
        fakeMessage(
          'UT014 verifies only mock interaction and does not show a value or state outcome.',
        ),
        fakeRemediation(
          'Add a value, state, or observable effect assertion when the interaction alone is not the intended contract.',
        ),
      ),
    );
  }

  if (
    hasOnlyMatchers(
      sourceFile,
      ['toMatchSnapshot', 'toMatchInlineSnapshot'],
      testCase.framework,
      nativeBindings,
      expectBindings,
      rootCallbackStart,
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'UT015',
        'WEAK',
        'WARNING',
        'HIGH',
        fakeMessage(
          'UT015 verifies only a snapshot representation. Static analysis cannot determine whether the snapshot is an adequate oracle.',
        ),
        fakeRemediation(
          'Add an independently meaningful value, state, or effect assertion when snapshot coverage alone is insufficient.',
        ),
      ),
    );
  }

  if (
    hasOnlyZeroArgumentMatchers(
      sourceFile,
      ['toBeDefined', 'toBeTruthy'],
      () => true,
      testCase.framework,
      nativeBindings,
      expectBindings,
      rootCallbackStart,
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'UT004',
        'WEAK',
        'WARNING',
        'HIGH',
        fakeMessage('UT004 verifies only that a value is defined or truthy.'),
        fakeRemediation(
          'Add an independently meaningful value, state, or effect assertion.',
        ),
      ),
    );
  }

  for (const assertion of testAssertions) {
    const expected = assertion.expected;
    const literalComparisonIsStatic =
      !assertion.isNegated &&
      !assertion.hasPromiseModifier &&
      (!assertion.isPolled || assertion.pollResultKnown);
    const structuralComparisonIsStatic =
      literalComparisonIsStatic && !assertion.isPolled;
    if (
      literalComparisonIsStatic &&
      expected &&
      isSimpleLiteral(assertion.actual) &&
      isSimpleLiteral(expected) &&
      literalKey(assertion.actual) === literalKey(expected)
    ) {
      findings.push(
        finding(
          testCase,
          assertion.matcher,
          'UT002',
          'FAKE',
          'CRITICAL',
          'HIGH',
          fakeMessage(
            'UT002 compares the same literal value on both sides of an assertion.',
          ),
          fakeRemediation(
            'Derive the expected literal independently from the behavior under test.',
          ),
        ),
      );
    }

    if (
      structuralComparisonIsStatic &&
      expected &&
      !isSimpleLiteral(assertion.actual) &&
      structuralText(assertion.actual) === structuralText(expected)
    ) {
      const repeatedEvaluationMayDiffer =
        hasPotentialEvaluationDifference(assertion.actual) ||
        hasPotentialEvaluationDifference(expected);
      findings.push(
        finding(
          testCase,
          assertion.matcher,
          'UT003',
          repeatedEvaluationMayDiffer ? 'WEAK' : 'FAKE',
          repeatedEvaluationMayDiffer ? 'WARNING' : 'CRITICAL',
          'HIGH',
          repeatedEvaluationMayDiffer
            ? 'UT003 repeats structurally identical expressions that may allocate fresh identities, invoke calls, access properties, coerce values, or use mutation-capable syntax. Their evaluations may produce different values; static analysis cannot determine their runtime results.'
            : fakeMessage(
                'UT003 asserts an expression against the identical expression.',
              ),
          fakeRemediation(
            'Compare the observed value with an independently derived expected value.',
          ),
        ),
      );
    }

    if (
      structuralComparisonIsStatic &&
      expected &&
      ts.isCallExpression(assertion.actual) &&
      ts.isCallExpression(expected) &&
      structuralText(assertion.actual.expression) ===
        structuralText(expected.expression) &&
      structurallyIdenticalArguments(
        assertion.actual.arguments,
        expected.arguments,
      )
    ) {
      findings.push(
        finding(
          testCase,
          assertion.matcher,
          'UT011',
          'WEAK',
          'WARNING',
          'MEDIUM',
          'UT011 calls the same callee with structurally identical arguments twice. The two calls may have side effects or return different values; static analysis cannot determine their runtime behavior.',
          fakeRemediation(
            'Call the system under test once and compare its result with an independent expectation.',
          ),
        ),
      );
    }
  }

  visitExecutableNodes(
    sourceFile,
    (node) => {
      if (!ts.isCatchClause(node)) return;

      const statements = node.block.statements;
      const onlyLogs =
        statements.length === 0 || statements.every(isConsoleLoggingStatement);
      if (!onlyLogs) return;

      const tryStatement = node.parent;
      const swallowsRecognizedAssertion =
        ts.isTryStatement(tryStatement) &&
        testAssertions.some((assertion) =>
          isDescendantOf(assertion.matcher, tryStatement.tryBlock),
        );

      findings.push(
        finding(
          testCase,
          node,
          'UT008',
          swallowsRecognizedAssertion ? 'FAKE' : 'WEAK',
          swallowsRecognizedAssertion ? 'CRITICAL' : 'WARNING',
          swallowsRecognizedAssertion ? 'HIGH' : 'MEDIUM',
          swallowsRecognizedAssertion
            ? fakeMessage(
                'UT008 catches an assertion failure without throwing it and only leaves the catch empty or logs it.',
              )
            : 'UT008 catches an error and only leaves the catch empty or logs it. Static analysis cannot determine whether this is expected cleanup or suppresses a test failure.',
          swallowsRecognizedAssertion
            ? fakeRemediation(
                'Assert the expected failure in the catch block or rethrow the error so an unexpected assertion failure can fail the test.',
              )
            : 'Confirm the caught error is expected; otherwise assert the expected failure or rethrow unexpected errors.',
        ),
      );
    },
    {
      expectBindings,
      framework: testCase.framework,
      rootCallbackStart,
    },
  );

  return findings;
}

function isDescendantOf(node: ts.Node, ancestor: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function hasPotentialEvaluationDifference(expression: ts.Expression): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (found) return;
    if (
      ts.isArrayLiteralExpression(node) ||
      ts.isObjectLiteralExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isClassExpression(node) ||
      ts.isRegularExpressionLiteral(node) ||
      ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node) ||
      ts.isCallExpression(node) ||
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node) ||
      ts.isNewExpression(node) ||
      ts.isDeleteExpression(node) ||
      ts.isAwaitExpression(node) ||
      ts.isYieldExpression(node) ||
      ts.isTemplateExpression(node) ||
      ts.isTaggedTemplateExpression(node) ||
      ts.isSpreadAssignment(node) ||
      ts.isSpreadElement(node) ||
      ts.isComputedPropertyName(node) ||
      (ts.isBinaryExpression(node) &&
        binaryExpressionMayInvokeUserCode(node)) ||
      ((ts.isPrefixUnaryExpression(node) ||
        ts.isPostfixUnaryExpression(node)) &&
        (node.operator === ts.SyntaxKind.PlusPlusToken ||
          node.operator === ts.SyntaxKind.MinusMinusToken ||
          node.operator === ts.SyntaxKind.PlusToken ||
          node.operator === ts.SyntaxKind.MinusToken ||
          node.operator === ts.SyntaxKind.TildeToken))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(expression);
  return found;
}

function binaryExpressionMayInvokeUserCode(
  expression: ts.BinaryExpression,
): boolean {
  switch (expression.operatorToken.kind) {
    case ts.SyntaxKind.AmpersandAmpersandToken:
    case ts.SyntaxKind.BarBarToken:
    case ts.SyntaxKind.QuestionQuestionToken:
    case ts.SyntaxKind.CommaToken:
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return false;
    default:
      return true;
  }
}

function isConsoleLoggingStatement(statement: ts.Statement): boolean {
  if (
    !ts.isExpressionStatement(statement) ||
    !ts.isCallExpression(statement.expression)
  ) {
    return false;
  }

  const expression = statement.expression.expression;
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'console' &&
    ['debug', 'error', 'info', 'log', 'warn'].includes(expression.name.text)
  );
}
