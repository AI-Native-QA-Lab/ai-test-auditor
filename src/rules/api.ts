import * as ts from 'typescript';
import type { Finding, TestCase } from '../core/types.js';
import { assertions, finding, sourceFileFor } from './utils.js';

export function evaluateApiRules(testCase: TestCase): Finding[] {
  if (testCase.type !== 'api') return [];

  const testAssertions = assertions(sourceFileFor(testCase));
  if (
    testAssertions.length === 0 ||
    !testAssertions.every((assertion) => isResponseStatus(assertion.actual))
  ) {
    return [];
  }

  return [
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
  ];
}

function isResponseStatus(expression: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'response' &&
    (expression.name.text === 'status' || expression.name.text === 'statusCode')
  );
}
