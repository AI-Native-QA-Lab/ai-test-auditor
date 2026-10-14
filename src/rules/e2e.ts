import * as ts from 'typescript';
import { visitExecutableNodes } from './ast-traversal.js';
import { isShadowedBeforeScope } from '../core/scope-analysis.js';
import type { Finding, TestCase } from '../core/types.js';
import {
  assertions,
  finding,
  hasOnlyZeroArgumentMatchers,
  expectAssertionForMatcher,
  sourceFileFor,
} from './utils.js';

export function evaluateE2eRules(testCase: TestCase): Finding[] {
  if (testCase.type !== 'e2e') return [];

  const sourceFile = sourceFileFor(testCase);
  const findings: Finding[] = [];
  const expectBindings = testCase.expectBindings;
  const testAssertions = assertions(
    sourceFile,
    testCase.framework,
    testCase.nativeAssertionBindings,
    expectBindings,
  );

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

  if (
    hasOnlyZeroArgumentMatchers(
      sourceFile,
      ['toBeVisible'],
      undefined,
      testCase.framework,
      testCase.nativeAssertionBindings,
      expectBindings,
    )
  ) {
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

  visitExecutableNodes(
    sourceFile,
    (node) => {
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
          statements.length === 0 ||
          statements.every(isConsoleLoggingStatement);
        if (
          onlyLogs &&
          ts.isTryStatement(tryStatement) &&
          containsPlaywrightCall(
            tryStatement.tryBlock,
            expectBindings,
            testCase.framework,
          )
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

      if (
        ts.isCallExpression(node) &&
        isPlaywrightMatcher(node, expectBindings)
      ) {
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

      if (isUnawaitedPageAction(node, testCase)) {
        findings.push(
          finding(
            testCase,
            node,
            'E2E009',
            'WEAK',
            'WARNING',
            'HIGH',
            'E2E009 found an explicit Playwright page action without a visible await or consumed result. Static analysis cannot determine whether later steps race the action.',
            'Await the page action or use an explicit synchronization contract. Static analysis cannot verify runtime scheduling.',
          ),
        );
      }
    },
    { expectBindings, framework: testCase.framework },
  );

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

  visitExecutableNodes(
    sourceFile,
    (node) => {
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
    },
    { expectBindings, framework: testCase.framework },
  );

  return findings;
}

const UNSTABLE_SELECTOR_METHODS = ['locator', '$', '$$'] as const;
const PLAYWRIGHT_MATCHERS = [
  'toBeAttached',
  'toBeOK',
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
  'toContainClass',
  'toMatchAriaSnapshot',
  'toPass',
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
  const engine = /^(css|xpath)=/i.exec(value)?.[1]?.toLowerCase();
  const selectorBody = engine ? value.slice(engine.length + 1).trim() : value;
  if (engine === 'xpath') return true;

  const syntax = selectorBody.replace(/\[[^\]]*\]/g, ' ').trim();
  return (
    selectorBody.startsWith('//') ||
    /:nth-/.test(syntax) ||
    /^[a-z][a-z0-9-]*$/i.test(syntax) ||
    /[.#][\w-]+/.test(syntax) ||
    /[>+~\s]/.test(syntax)
  );
}

function isPlaywrightMatcher(
  node: ts.CallExpression,
  expectBindings?: readonly string[],
  framework: TestCase['framework'] = 'playwright',
): boolean {
  if (!ts.isPropertyAccessExpression(node.expression)) return false;
  const assertion = expectAssertionForMatcher(node, expectBindings, framework);
  return Boolean(
    assertion &&
    (PLAYWRIGHT_MATCHERS.includes(
      node.expression.name.text as (typeof PLAYWRIGHT_MATCHERS)[number],
    ) ||
      assertion.isPolled),
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
  if (
    ts.isVoidExpression(current.parent) &&
    current.parent.expression === current
  ) {
    return true;
  }
  return ts.isExpressionStatement(current.parent);
}

function isUnawaitedPageAction(
  node: ts.Node,
  testCase: TestCase,
): node is ts.CallExpression {
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
  return (
    isDirectUnawaitedExpression(node) || isAssignedAndUnused(node, testCase)
  );
}

function isAssignedAndUnused(
  action: ts.CallExpression,
  testCase: TestCase,
): boolean {
  let current: ts.Expression = action;
  while (ts.isParenthesizedExpression(current.parent)) {
    current = current.parent;
  }
  const declaration = current.parent;
  if (
    !ts.isVariableDeclaration(declaration) ||
    declaration.initializer !== current ||
    !ts.isIdentifier(declaration.name)
  ) {
    return false;
  }

  const declarationScope = variableDeclarationScope(declaration);
  if (!declarationScope) return false;

  const declarationName = declaration.name;
  const localName = declarationName.text;
  let referenced = false;
  visitExecutableNodes(
    action.getSourceFile(),
    (node) => {
      if (referenced) return;
      if (
        ts.isIdentifier(node) &&
        node.text === localName &&
        node !== declarationName &&
        !isNonReferenceIdentifier(node) &&
        !isShadowedBeforeScope(node, localName, declarationScope)
      ) {
        referenced = true;
      }
    },
    { expectBindings: testCase.expectBindings, framework: testCase.framework },
  );
  return !referenced;
}

function variableDeclarationScope(
  declaration: ts.VariableDeclaration,
): ts.Node | undefined {
  const declarationList = declaration.parent;
  if (!ts.isVariableDeclarationList(declarationList)) return undefined;

  const isBlockScoped =
    (declarationList.flags & ts.NodeFlags.BlockScoped) !== 0;
  let current: ts.Node | undefined = declarationList.parent;
  if (
    isBlockScoped &&
    (ts.isForStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isForOfStatement(current)) &&
    current.initializer === declarationList
  ) {
    return current;
  }

  while (current) {
    if (
      isBlockScoped &&
      (ts.isBlock(current) ||
        ts.isCaseBlock(current) ||
        ts.isModuleBlock(current) ||
        ts.isSourceFile(current))
    ) {
      return current;
    }
    if (
      !isBlockScoped &&
      (ts.isFunctionLike(current) ||
        ts.isClassStaticBlockDeclaration(current) ||
        ts.isModuleBlock(current) ||
        ts.isSourceFile(current))
    ) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

function isNonReferenceIdentifier(identifier: ts.Identifier): boolean {
  const parent = identifier.parent;
  return (
    (ts.isBinaryExpression(parent) &&
      parent.left === identifier &&
      parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) ||
    (ts.isPropertyAccessExpression(parent) && parent.name === identifier) ||
    (ts.isPropertyAssignment(parent) && parent.name === identifier) ||
    (ts.isMethodDeclaration(parent) && parent.name === identifier) ||
    (ts.isPropertyDeclaration(parent) && parent.name === identifier) ||
    (ts.isVariableDeclaration(parent) && parent.name === identifier) ||
    (ts.isParameter(parent) && parent.name === identifier)
  );
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

function containsPlaywrightCall(
  block: ts.Block,
  expectBindings?: readonly string[],
  framework: TestCase['framework'] = 'unknown',
): boolean {
  let found = false;
  visitExecutableNodes(
    block,
    (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        isPageRooted(node.expression.expression)
      ) {
        found = true;
      }
    },
    { expectBindings, framework },
  );
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
  if (assertion.isNegated) return false;

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
