import * as ts from 'typescript';
import type { Finding, TestCase } from '../core/types.js';
import {
  assertions,
  finding,
  hasOnlyZeroArgumentMatchers,
  sourceFileFor,
  visitNodes,
} from './utils.js';

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

  if (hasOnlyZeroArgumentMatchers(sourceFile, ['toBeVisible'])) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'E2E003',
        'WEAK',
        'WARNING',
        'HIGH',
        'E2E003 verifies only element visibility. Static analysis cannot determine whether visible UI proves the user journey outcome.',
        'Add assertions for the user-visible value, state change, or completed outcome. Static analysis cannot judge every meaningful journey outcome.',
      ),
    );
  }

  visitNodes(sourceFile, (node) => {
    if (isUnstableSelectorCall(node)) {
      findings.push(
        finding(
          testCase,
          node,
          'E2E005',
          'WEAK',
          'WARNING',
          'HIGH',
          'E2E005 uses a selector literal based on a class, id, bare tag, XPath, or CSS structure. Static analysis cannot determine whether the selector is stable in the application.',
          'Prefer an explicit role, label, test id, or other stable contract. Static analysis cannot judge runtime selector stability.',
        ),
      );
    }

    if (ts.isCatchClause(node)) {
      const tryStatement = node.parent;
      const statements = node.block.statements;
      const onlyLogs =
        statements.length === 0 || statements.every(isConsoleLoggingStatement);
      if (
        onlyLogs &&
        ts.isTryStatement(tryStatement) &&
        containsPlaywrightCall(tryStatement.tryBlock)
      ) {
        findings.push(
          finding(
            testCase,
            node,
            'E2E006',
            'FAKE',
            'CRITICAL',
            'HIGH',
            'E2E006 catches a Playwright error and leaves the journey passing. Static analysis cannot determine whether the failure was expected cleanup.',
            'Assert the expected error or rethrow the Playwright failure so an unexpected journey error can fail the test.',
          ),
        );
      }
    }

    if (ts.isCallExpression(node) && isPlaywrightMatcher(node)) {
      if (hasConditionalAncestor(node)) {
        findings.push(
          finding(
            testCase,
            node,
            'E2E007',
            'WEAK',
            'WARNING',
            'HIGH',
            'E2E007 places a Playwright assertion inside a conditional path. Static analysis cannot determine whether every journey path is covered.',
            'Make the expected assertion unconditional or explicitly test each branch. Static analysis cannot judge whether the condition is intentional.',
          ),
        );
      }

      if (isDirectUnawaitedExpression(node)) {
        findings.push(
          finding(
            testCase,
            node,
            'E2E008',
            'FAKE',
            'CRITICAL',
            'HIGH',
            'E2E008 calls a Playwright matcher as a direct expression without awaiting it. Static analysis cannot determine whether the promise is awaited elsewhere.',
            'Await the matcher directly so a failed Playwright assertion rejects the test. Static analysis does not inspect runtime promise handling.',
          ),
        );
      }
    }

    if (isUnawaitedPageAction(node)) {
      findings.push(
        finding(
          testCase,
          node,
          'E2E009',
          'WEAK',
          'WARNING',
          'HIGH',
          'E2E009 calls an explicit Playwright page action without awaiting it. Static analysis cannot determine whether later steps race the action.',
          'Await the page action or use an explicit synchronization contract. Static analysis cannot verify runtime scheduling.',
        ),
      );
    }
  });

  if (testAssertions.length > 0 && testAssertions.every(isEmptyUiAssertion)) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'E2E010',
        'WEAK',
        'WARNING',
        'HIGH',
        'E2E010 checks only empty text or attribute values. Static analysis cannot determine whether the empty UI state is the intended journey outcome.',
        'Assert a meaningful non-empty value or an explicitly documented empty-state contract. Static analysis cannot judge product semantics.',
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

const UNSTABLE_SELECTOR_METHODS = ['locator', '$', '$$'] as const;
const PLAYWRIGHT_MATCHERS = [
  'toBeAttached',
  'toBeChecked',
  'toBeDisabled',
  'toBeEditable',
  'toBeEmpty',
  'toBeEnabled',
  'toBeFocused',
  'toBeHidden',
  'toBeInViewport',
  'toBeVisible',
  'toHaveAccessibleDescription',
  'toHaveAccessibleName',
  'toHaveAttribute',
  'toHaveClass',
  'toHaveCount',
  'toHaveCSS',
  'toHaveId',
  'toHaveJSProperty',
  'toHaveRole',
  'toHaveScreenshot',
  'toHaveText',
  'toHaveTitle',
  'toHaveURL',
  'toHaveValue',
  'toHaveValues',
  'toContainText',
] as const;
const PAGE_ACTION_METHODS = [
  'goto',
  'click',
  'dblclick',
  'fill',
  'press',
  'check',
  'uncheck',
  'selectOption',
  'setInputFiles',
  'hover',
  'dragTo',
  'waitForURL',
  'waitForLoadState',
  'waitForSelector',
] as const;

function isUnstableSelectorCall(node: ts.Node): node is ts.CallExpression {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    !ts.isIdentifier(node.expression.expression) ||
    node.expression.expression.text !== 'page' ||
    !UNSTABLE_SELECTOR_METHODS.includes(
      node.expression.name.text as (typeof UNSTABLE_SELECTOR_METHODS)[number],
    )
  ) {
    return false;
  }

  const selector = node.arguments[0];
  return Boolean(
    selector &&
    ts.isStringLiteralLike(selector) &&
    isUnstableSelector(selector.text),
  );
}

function isUnstableSelector(selector: string): boolean {
  const value = selector.trim();
  return (
    value.startsWith('.') ||
    value.startsWith('#') ||
    value.startsWith('//') ||
    value.includes(':nth-') ||
    /^[a-z][a-z0-9-]*$/i.test(value) ||
    /[>+~\s]/.test(value)
  );
}

function isPlaywrightMatcher(node: ts.CallExpression): boolean {
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    PLAYWRIGHT_MATCHERS.includes(
      node.expression.name.text as (typeof PLAYWRIGHT_MATCHERS)[number],
    ) &&
    ts.isCallExpression(node.expression.expression) &&
    ts.isIdentifier(node.expression.expression.expression) &&
    node.expression.expression.expression.text === 'expect'
  );
}

function hasConditionalAncestor(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isIfStatement(current) || ts.isConditionalExpression(current)) {
      return true;
    }
    if (
      ts.isBinaryExpression(current) &&
      (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        current.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isDirectUnawaitedExpression(node: ts.Node): boolean {
  let current = node;
  while (ts.isParenthesizedExpression(current.parent)) {
    current = current.parent;
  }
  return ts.isExpressionStatement(current.parent);
}

function isUnawaitedPageAction(node: ts.Node): node is ts.CallExpression {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    !PAGE_ACTION_METHODS.includes(
      node.expression.name.text as (typeof PAGE_ACTION_METHODS)[number],
    ) ||
    !isPageRooted(node.expression.expression)
  ) {
    return false;
  }
  return isDirectUnawaitedExpression(node);
}

function isPageRooted(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) return expression.text === 'page';
  if (ts.isPropertyAccessExpression(expression)) {
    return isPageRooted(expression.expression);
  }
  if (ts.isCallExpression(expression)) {
    return isPageRooted(expression.expression);
  }
  return false;
}

function containsPlaywrightCall(block: ts.Block): boolean {
  let found = false;
  visitNodes(block, (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      isPageRooted(node.expression.expression)
    ) {
      found = true;
    }
  });
  return found;
}

function isConsoleLoggingStatement(statement: ts.Statement): boolean {
  if (
    !ts.isExpressionStatement(statement) ||
    !ts.isCallExpression(statement.expression) ||
    !ts.isPropertyAccessExpression(statement.expression.expression) ||
    !ts.isIdentifier(statement.expression.expression.expression)
  ) {
    return false;
  }
  return (
    statement.expression.expression.expression.text === 'console' &&
    ['debug', 'error', 'info', 'log', 'warn'].includes(
      statement.expression.expression.name.text,
    )
  );
}

function isEmptyUiAssertion(
  assertion: ReturnType<typeof assertions>[number],
): boolean {
  const first = assertion.matcher.arguments[0];
  const second = assertion.matcher.arguments[1];
  if (['toHaveText', 'toContainText'].includes(assertion.matcherName)) {
    return Boolean(first && ts.isStringLiteralLike(first) && first.text === '');
  }
  return (
    assertion.matcherName === 'toHaveAttribute' &&
    Boolean(second && ts.isStringLiteralLike(second) && second.text === '')
  );
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
