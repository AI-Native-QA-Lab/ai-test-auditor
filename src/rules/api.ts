import * as ts from 'typescript';
import type { Finding, TestCase } from '../core/types.js';
import {
  assertions,
  finding,
  hasOnlyZeroArgumentMatchers,
  sourceFileFor,
} from './utils.js';

export function evaluateApiRules(testCase: TestCase): Finding[] {
  if (testCase.type !== 'api') return [];

  const sourceFile = sourceFileFor(testCase);
  const testAssertions = assertions(sourceFile);
  const findings: Finding[] = [];
  if (
    hasOnlyZeroArgumentMatchers(
      sourceFile,
      ['toBeDefined', 'toBeTruthy'],
      isResponseBody,
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'API002',
        'WEAK',
        'WARNING',
        'HIGH',
        'API002 verifies only that response.body or response.data exists. Static analysis cannot determine whether existence is sufficient for this endpoint.',
        'Add assertions for response content, headers, or persisted effects. Static analysis cannot judge all meaningful API outcomes.',
      ),
    );
  }
  if (
    testAssertions.length === 0 ||
    !testAssertions.every((assertion) => isResponseStatus(assertion.actual))
  ) {
    return findings;
  }

  findings.push(
    finding(
      testCase,
      testAssertions[0].matcher,
      'API001',
      'WEAK',
      'WARNING',
      'HIGH',
      'API001 verifies only response.status or response.statusCode. Static analysis cannot determine whether status is sufficient for this endpoint.',
      'Add assertions for response behavior, body, headers, or persisted effects. Static analysis cannot judge all meaningful API outcomes.',
    ),
  );
  return findings;
}

function isResponseBody(expression: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'response' &&
    ['body', 'data'].includes(expression.name.text)
  );
}

function isResponseStatus(expression: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'response' &&
    (expression.name.text === 'status' || expression.name.text === 'statusCode')
  );
}
