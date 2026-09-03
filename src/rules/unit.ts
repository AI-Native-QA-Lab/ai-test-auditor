import * as ts from 'typescript';
import type { Finding, TestCase } from '../core/types.js';
import {
  assertions,
  expectCalls,
  finding,
  isSimpleLiteral,
  isUnitTest,
  literalKey,
  sourceFileFor,
  structuralText,
  structurallyIdenticalArguments,
  visitNodes,
} from './utils.js';

const fakeMessage = (detail: string): string =>
  `${detail} Static analysis inspects source syntax only and cannot prove runtime behavior.`;

const fakeRemediation = (detail: string): string =>
  `${detail} Static analysis cannot determine whether the revised assertion covers every behavior path.`;

export function evaluateUnitRules(testCase: TestCase): Finding[] {
  if (!isUnitTest(testCase)) return [];

  const sourceFile = sourceFileFor(testCase);
  const findings: Finding[] = [];
  const testAssertions = assertions(sourceFile);

  if (expectCalls(sourceFile).length === 0) {
    findings.push(
      finding(
        testCase,
        sourceFile,
        'UT001',
        'FAKE',
        'CRITICAL',
        'HIGH',
        fakeMessage(
          'UT001 found no Jest, Vitest, or Playwright expect call in this test.',
        ),
        fakeRemediation(
          'Add an assertion for an observable behavior or side effect.',
        ),
      ),
    );
  }

  for (const assertion of testAssertions) {
    const expected = assertion.matcher.arguments[0];
    if (
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
      expected &&
      !isSimpleLiteral(assertion.actual) &&
      structuralText(assertion.actual) === structuralText(expected)
    ) {
      findings.push(
        finding(
          testCase,
          assertion.matcher,
          'UT003',
          'FAKE',
          'CRITICAL',
          'HIGH',
          fakeMessage(
            'UT003 asserts an expression against the identical expression.',
          ),
          fakeRemediation(
            'Compare the observed value with an independently derived expected value.',
          ),
        ),
      );
    }

    if (
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
          'FAKE',
          'CRITICAL',
          'HIGH',
          fakeMessage(
            'UT011 calls the same callee with structurally identical arguments for both actual and expected values.',
          ),
          fakeRemediation(
            'Call the system under test once and compare its result with an independent expectation.',
          ),
        ),
      );
    }
  }

  visitNodes(sourceFile, (node) => {
    if (!ts.isCatchClause(node)) return;

    const statements = node.block.statements;
    const onlyLogs =
      statements.length === 0 || statements.every(isConsoleLoggingStatement);
    if (!onlyLogs) return;

    findings.push(
      finding(
        testCase,
        node,
        'UT008',
        'FAKE',
        'CRITICAL',
        'HIGH',
        fakeMessage(
          'UT008 catches an error without throwing it and only leaves it empty or logs it.',
        ),
        fakeRemediation(
          'Assert the failure behavior or rethrow the error so an unexpected failure can fail the test.',
        ),
      ),
    );
  });

  return findings;
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
