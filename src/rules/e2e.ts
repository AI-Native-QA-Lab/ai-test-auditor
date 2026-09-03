import * as ts from 'typescript';
import type { Finding, TestCase } from '../core/types.js';
import { assertions, finding, sourceFileFor, visitNodes } from './utils.js';

export function evaluateE2eRules(testCase: TestCase): Finding[] {
  if (testCase.type !== 'e2e') return [];

  const sourceFile = sourceFileFor(testCase);
  const findings: Finding[] = [];
  const testAssertions = assertions(sourceFile);

  if (testAssertions.length === 0) {
    findings.push(
      finding(
        testCase,
        sourceFile,
        'E2E001',
        'FAKE',
        'CRITICAL',
        'HIGH',
        'E2E001 found no expect assertion in this Playwright journey. Static analysis cannot prove that navigation or actions alone verify a user-visible outcome.',
        'Add an assertion for an observable user-facing result or state change. Static analysis cannot determine whether every intended journey outcome is covered.',
      ),
    );
  }

  if (
    testAssertions.length > 0 &&
    testAssertions.every((assertion) => assertion.matcherName === 'toHaveURL')
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0].matcher,
        'E2E002',
        'WEAK',
        'WARNING',
        'HIGH',
        'E2E002 verifies only page URL state. Static analysis cannot determine whether navigation alone proves the user journey.',
        'Add assertions for visible user-facing outcomes or state changes. Static analysis cannot judge every meaningful journey outcome.',
      ),
    );
  }

  visitNodes(sourceFile, (node) => {
    if (!isNumericPageWait(node)) return;

    findings.push(
      finding(
        testCase,
        node,
        'E2E004',
        'WEAK',
        'WARNING',
        'HIGH',
        'E2E004 uses a numeric page.waitForTimeout sleep. Static analysis cannot determine whether the wait is required by an external system.',
        'Wait for a specific page condition or network outcome instead. Static analysis cannot verify all asynchronous dependencies.',
      ),
    );
  });

  return findings;
}

function isNumericPageWait(node: ts.Node): node is ts.CallExpression {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression)
  ) {
    return false;
  }

  const timeout = node.arguments[0];
  return (
    node.expression.name.text === 'waitForTimeout' &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'page' &&
    Boolean(timeout && ts.isNumericLiteral(timeout))
  );
}
