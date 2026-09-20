import * as ts from 'typescript';
import type { Finding, TestCase } from '../core/types.js';
import {
  assertions,
  expectCalls,
  finding,
  hasOnlyZeroArgumentMatchers,
  sourceFileFor,
  visitNodes,
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
    hasOnlyZeroArgumentMatchers(
      sourceFile,
      ['toBeDefined', 'toBeTruthy'],
      isResponseObject,
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'API003',
        'WEAK',
        'WARNING',
        'HIGH',
        weakMessage(
          'API003 verifies only that the response object exists. Static analysis cannot determine whether its schema or business state is correct.',
        ),
        weakRemediation(
          'Add assertions for response fields, headers, or an independently meaningful business outcome.',
        ),
      ),
    );
  }

  if (
    hasOnlyApiAssertions(
      sourceFile,
      testAssertions,
      (assertion) =>
        isResponseBodyOrData(assertion.actual) &&
        ['toEqual', 'toStrictEqual', 'toMatchObject'].includes(
          assertion.matcherName,
        ) &&
        Boolean(assertion.matcher.arguments[0]) &&
        isRequestLike(assertion.matcher.arguments[0]!),
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'API004',
        'WEAK',
        'WARNING',
        'HIGH',
        weakMessage(
          'API004 compares the response body or data only with a request-like value. Static analysis cannot determine whether the endpoint performed the intended business transformation.',
        ),
        weakRemediation(
          'Assert an independently derived response value or business state in addition to any request echo.',
        ),
      ),
    );
  }

  if (
    hasOnlyApiAssertions(
      sourceFile,
      testAssertions,
      (assertion) =>
        isResponseBodyOrData(assertion.actual) &&
        assertion.matcherName === 'toHaveProperty' &&
        assertion.matcher.arguments.length === 1,
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'API005',
        'WEAK',
        'WARNING',
        'HIGH',
        weakMessage(
          'API005 verifies only that response body or data properties exist. Static analysis cannot determine whether their values satisfy the endpoint contract.',
        ),
        weakRemediation(
          'Assert representative property values, relationships, or persisted effects.',
        ),
      ),
    );
  }

  if (
    hasOnlyZeroArgumentMatchers(
      sourceFile,
      ['toBeDefined', 'toBeTruthy'],
      isResponseHeaders,
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'API006',
        'WEAK',
        'WARNING',
        'HIGH',
        weakMessage(
          'API006 verifies only that response headers exist. Static analysis cannot determine whether the headers describe a correct API result.',
        ),
        weakRemediation(
          'Assert meaningful header values together with response content or business state.',
        ),
      ),
    );
  }

  if (
    hasOnlyApiAssertions(
      sourceFile,
      testAssertions,
      (assertion) =>
        isContentTypeExpression(assertion.actual) &&
        ['toBe', 'toEqual', 'toStrictEqual', 'toContain', 'toMatch'].includes(
          assertion.matcherName,
        ),
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'API007',
        'WEAK',
        'WARNING',
        'HIGH',
        weakMessage(
          'API007 verifies only response content-type metadata. Static analysis cannot determine whether the response body or business state is correct.',
        ),
        weakRemediation(
          'Add assertions for response content, schema values, or persisted effects.',
        ),
      ),
    );
  }

  if (
    hasOnlyApiAssertions(
      sourceFile,
      testAssertions,
      (assertion) =>
        isResponseRequestMetadata(assertion.actual) &&
        ['toBe', 'toEqual', 'toStrictEqual', 'toContain', 'toMatch'].includes(
          assertion.matcherName,
        ),
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'API008',
        'WEAK',
        'WARNING',
        'HIGH',
        weakMessage(
          'API008 verifies only request method or URL metadata exposed by the response. Static analysis cannot determine whether the API behavior is correct.',
        ),
        weakRemediation(
          'Add assertions for response data, error behavior, or business state.',
        ),
      ),
    );
  }

  if (
    hasOnlyApiAssertions(sourceFile, testAssertions, isEmptyResponseAssertion)
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'API009',
        'WEAK',
        'WARNING',
        'HIGH',
        weakMessage(
          'API009 checks only an empty or zero-length response result. Static analysis cannot determine whether the empty result is the intended business outcome.',
        ),
        weakRemediation(
          'Assert the response state and the relevant non-empty or explicitly empty business contract.',
        ),
      ),
    );
  }

  visitNodes(sourceFile, (node) => {
    if (!ts.isCatchClause(node)) return;
    const statements = node.block.statements;
    const onlyLogs =
      statements.length === 0 || statements.every(isConsoleLoggingStatement);
    const tryStatement = node.parent;
    if (
      !onlyLogs ||
      !ts.isTryStatement(tryStatement) ||
      !containsRequestCall(tryStatement.tryBlock)
    ) {
      return;
    }

    findings.push(
      finding(
        testCase,
        node,
        'API010',
        'FAKE',
        'CRITICAL',
        'HIGH',
        'API010 catches an API request error and leaves the test passing. Static analysis cannot determine whether the request failure was expected.',
        'Assert the expected error or rethrow the request failure so an unexpected API error can fail the test.',
      ),
    );
  });
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

function isResponseObject(expression: ts.Expression): boolean {
  return ts.isIdentifier(expression) && expression.text === 'response';
}

function isResponseBodyOrData(expression: ts.Expression): boolean {
  return isResponseBody(expression);
}

function isResponseHeaders(expression: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(expression) &&
    isResponseObject(expression.expression) &&
    expression.name.text === 'headers'
  );
}

function isRequestLike(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) {
    return ['requestBody', 'requestPayload', 'payload', 'input'].includes(
      expression.text,
    );
  }
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'request' &&
    ['body', 'data'].includes(expression.name.text)
  );
}

function isContentTypeExpression(expression: ts.Expression): boolean {
  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === 'get' &&
    isResponseHeaders(expression.expression.expression)
  ) {
    const name = expression.arguments[0];
    return Boolean(
      name &&
      ts.isStringLiteralLike(name) &&
      name.text.toLowerCase() === 'content-type',
    );
  }
  return (
    ts.isElementAccessExpression(expression) &&
    isResponseHeaders(expression.expression) &&
    Boolean(
      expression.argumentExpression &&
      ts.isStringLiteralLike(expression.argumentExpression) &&
      expression.argumentExpression.text.toLowerCase() === 'content-type',
    )
  );
}

function isResponseRequestMetadata(expression: ts.Expression): boolean {
  return (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    ['method', 'url'].includes(expression.expression.name.text) &&
    ts.isPropertyAccessExpression(expression.expression.expression) &&
    isResponseObject(expression.expression.expression.expression) &&
    expression.expression.expression.name.text === 'request'
  );
}

function isEmptyResponseAssertion(
  assertion: ReturnType<typeof assertions>[number],
): boolean {
  if (!isResponseBodyOrData(assertion.actual)) {
    return (
      ts.isPropertyAccessExpression(assertion.actual) &&
      assertion.actual.name.text === 'length' &&
      isResponseBodyOrData(assertion.actual.expression) &&
      ['toBe', 'toEqual', 'toStrictEqual'].includes(assertion.matcherName) &&
      assertion.matcher.arguments.length === 1 &&
      isNumericZero(assertion.matcher.arguments[0]!)
    );
  }

  const expected = assertion.matcher.arguments[0];
  return (
    ['toEqual', 'toStrictEqual'].includes(assertion.matcherName) &&
    Boolean(expected) &&
    ((ts.isObjectLiteralExpression(expected) &&
      expected.properties.length === 0) ||
      (ts.isArrayLiteralExpression(expected) && expected.elements.length === 0))
  );
}

function isNumericZero(expression: ts.Expression): boolean {
  return ts.isNumericLiteral(expression) && expression.text === '0';
}

function hasOnlyApiAssertions(
  sourceFile: ts.SourceFile,
  testAssertions: ReturnType<typeof assertions>,
  predicate: (assertion: ReturnType<typeof assertions>[number]) => boolean,
): boolean {
  return (
    testAssertions.length > 0 &&
    expectCalls(sourceFile).length === testAssertions.length &&
    testAssertions.every(predicate)
  );
}

function weakMessage(detail: string): string {
  return `${detail} Static analysis cannot determine whether the limited assertion is sufficient for this endpoint.`;
}

function weakRemediation(detail: string): string {
  return `${detail} Static analysis cannot judge all meaningful API outcomes.`;
}

function containsRequestCall(block: ts.Block): boolean {
  let found = false;
  visitNodes(block, (node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isPropertyAccessExpression(node.expression) ||
      !ts.isIdentifier(node.expression.expression)
    ) {
      return;
    }
    if (node.expression.expression.text === 'request') found = true;
  });
  return found;
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

function isResponseStatus(expression: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'response' &&
    (expression.name.text === 'status' || expression.name.text === 'statusCode')
  );
}
