import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  extractTests,
  extractTestsWithDiagnostics,
} from '../../src/core/extractor';
import { evaluateRules } from '../../src/core/rule-engine';

const fixtureDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    fixtureDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createFixture(name: string, source: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ata-extractor-'));
  const filePath = join(directory, name);
  fixtureDirectories.push(directory);
  await writeFile(filePath, source);
  return filePath;
}

describe('extractTests', () => {
  it('extracts direct Vitest-style test and it callbacks with their source locations and bodies', async () => {
    const filePath = await createFixture(
      'calculator.test.ts',
      "import { describe, expect, it, test } from 'vitest';\n\ndescribe('calculator', () => {\n  test('adds numbers', () => {\n    expect(1 + 2).toBe(3);\n  });\n\n  it('supports async callbacks', async () => {\n    await Promise.resolve();\n  });\n});\n\ntest.each([1])('parameterized %i', () => {});\n",
    );

    const tests = extractTests(filePath);

    expect(tests).toMatchObject([
      {
        name: 'calculator > adds numbers',
        framework: 'vitest',
        type: 'unknown',
        filePath: resolve(filePath),
        line: 4,
        source: '() => {\n    expect(1 + 2).toBe(3);\n  }',
        body: '{\n    expect(1 + 2).toBe(3);\n  }',
      },
      {
        name: 'calculator > supports async callbacks',
        framework: 'vitest',
        type: 'unknown',
        filePath: resolve(filePath),
        line: 8,
        source: 'async () => {\n    await Promise.resolve();\n  }',
        body: '{\n    await Promise.resolve();\n  }',
      },
      {
        name: 'parameterized %i',
        framework: 'vitest',
        type: 'unknown',
        line: 13,
      },
    ]);
    expect(tests).toHaveLength(3);
  });

  it('extracts same-file named function and function-variable callbacks', async () => {
    const filePath = await createFixture(
      'named-callbacks.test.ts',
      "import { expect, test } from 'vitest';\nfunction namedTest() {\n  expect(3).toBe(3);\n}\nconst arrowTest = () => {\n  expect(4).toBe(4);\n};\ntest('named function callback', namedTest);\ntest('named arrow callback', arrowTest);\n",
    );

    const tests = extractTests(filePath);

    expect(tests.map((testCase) => testCase.name)).toEqual([
      'named function callback',
      'named arrow callback',
    ]);
    expect(
      tests.map((testCase) =>
        evaluateRules(testCase).map((finding) => finding.ruleId),
      ),
    ).toEqual([['UT002'], ['UT002']]);
  });

  it('does not treat namespace-local test helpers as framework registrations', async () => {
    const filePath = await createFixture(
      'namespace-local-test.test.ts',
      "import { expect, test } from 'vitest';\nnamespace LocalSuite {\n  const test = (_name: string, callback: () => void) => callback();\n  const expect = localExpect;\n  test('local helper', () => { expect(1).toBe(1); });\n}\n",
    );

    expect(extractTests(filePath)).toEqual([]);
  });

  it('does not extract a global describe suite callback as a test', async () => {
    const filePath = await createFixture(
      'global-suite.test.ts',
      "describe('group', () => { test('case', () => { expect(1).toBe(1); }); });\n",
    );

    expect(extractTests(filePath).map((testCase) => testCase.name)).toEqual([
      'group > case',
    ]);
  });

  it('uses the lexical scope where named callbacks are defined', async () => {
    const vitestPath = await createFixture(
      'named-callback-shadowed-expect.test.ts',
      "import { expect, test } from 'vitest';\nfunction namedTest() {\n  expect(3).toBe(3);\n}\nif (useLocalExpect) {\n  const expect = (value) => ({ toBe: () => value });\n  test('named Vitest callback', namedTest);\n}\n",
    );
    const nodePath = await createFixture(
      'named-callback-shadowed-assert.test.ts',
      "import test from 'node:test';\nimport { strictEqual as equal } from 'node:assert/strict';\nfunction namedTest() {\n  equal(3, 3);\n}\nif (useLocalAssert) {\n  const equal = (actual, expected) => actual === expected;\n  test('named Node callback', namedTest);\n}\n",
    );

    const [vitestCase] = extractTests(vitestPath);
    const [nodeCase] = extractTests(nodePath);

    expect(evaluateRules(vitestCase!).map((finding) => finding.ruleId)).toEqual(
      ['UT002'],
    );
    expect(evaluateRules(nodeCase!).map((finding) => finding.ruleId)).toEqual([
      'UT002',
    ]);
  });

  it('extracts registrations from invoked helpers but skips uncalled helpers', async () => {
    const filePath = await createFixture(
      'helper-test-registrations.test.ts',
      "import { describe, expect, test } from 'vitest';\nfunction registerCalledTests() {\n  test('registered from called helper', () => {\n    expect(1).toBe(1);\n  });\n}\nfunction registerUnusedTests() {\n  test('not actually registered', () => {});\n}\nfunction registerFromSuite() {\n  test('registered from suite helper', () => {});\n}\nfunction invokeParameterShadow(registerUnusedTests) {\n  registerUnusedTests();\n}\nconst registerConciseTest = () => test('registered from concise helper', () => {});\nregisterCalledTests();\nregisterConciseTest();\ninvokeParameterShadow(() => {});\n(() => test('registered from IIFE', () => {}))();\ndescribe.skip('skipped suite', () => {\n  registerFromSuite();\n  test('registered in skipped suite', () => {});\n});\ntest('outer test callback', () => {\n  test('not registered during file loading', () => {});\n});\n",
    );

    expect(extractTests(filePath).map((testCase) => testCase.name)).toEqual([
      'registered from called helper',
      'registered from concise helper',
      'registered from IIFE',
      'registered from suite helper',
      'skipped suite > registered in skipped suite',
      'outer test callback',
    ]);
  });

  it('does not resolve imported, shadowed, or reassigned callback identifiers', async () => {
    const filePath = await createFixture(
      'unresolved-named-callbacks.test.ts',
      "import { test } from 'vitest';\nimport { runTest as importedTest } from './helper';\nfunction runTest() {}\nfunction reassignedFunction() {}\nfunction register(runTest) {\n  test('shadowed callback parameter', runTest);\n}\nfunction registerWithVarShadow() {\n  {\n    var runTest;\n  }\n  test('function-scoped var shadow', runTest);\n}\nlet reassignedVariable = () => {};\nreassignedVariable = reassignedFunction;\nrunTest = reassignedFunction;\ntest('imported callback', importedTest);\ntest('reassigned variable callback', reassignedVariable);\ntest('reassigned function callback', runTest);\nfor (runTest of callbacks) {\n  test('loop-assigned callback', runTest);\n}\n",
    );

    expect(extractTests(filePath)).toEqual([]);
  });

  it('does not resolve a callback that can be overwritten by a nested var initializer', async () => {
    const filePath = await createFixture(
      'nested-var-callback-write.test.js',
      "const { test } = require('vitest');\nvar testBody = () => { expect(1).toBe(1); };\nif (replace) { var testBody = () => {}; }\ntest('possibly overwritten callback', testBody);\n",
    );

    expect(extractTests(filePath)).toEqual([]);
  });

  it('does not resolve a callback assigned by a var for-of initializer', async () => {
    const filePath = await createFixture(
      'var-loop-callback-write.test.js',
      "const { test } = require('vitest');\nvar testBody = () => { expect(1).toBe(1); };\nfor (var testBody of callbacks) {}\ntest('possibly overwritten callback', testBody);\n",
    );

    expect(extractTests(filePath)).toEqual([]);
  });

  it('keeps a callback when a nested function only writes its own var binding', async () => {
    const filePath = await createFixture(
      'nested-function-var-callback.test.js',
      "const { test } = require('vitest');\nvar testBody = () => { expect(1).toBe(1); };\nfunction helper() { var testBody = () => {}; }\ntest('keeps outer callback', testBody);\n",
    );

    expect(extractTests(filePath).map((testCase) => testCase.name)).toEqual([
      'keeps outer callback',
    ]);
  });

  it('extracts callbacks registered with common test modifiers', async () => {
    const filePath = await createFixture(
      'modified-test-registration.test.ts',
      "import { test as spec } from 'vitest';\nspec.skip('skipped test', () => {});\nspec.only('focused test', () => {});\nspec.each([1])('parameterized test', () => {});\nspec.concurrent.skip.each([1])('concurrent parameterized test', () => {});\nspec.skipIf(process.env.CI)('conditionally skipped test', () => {});\n",
    );

    expect(extractTests(filePath).map((testCase) => testCase.name)).toEqual([
      'skipped test',
      'focused test',
      'parameterized test',
      'concurrent parameterized test',
      'conditionally skipped test',
    ]);
  });

  it('extracts Playwright fail and fixme test registrations without accepting each', async () => {
    const filePath = await createFixture(
      'playwright-test-modifiers.e2e.ts',
      "import { test as spec } from '@playwright/test';\nspec.fail('expected failure', () => {});\nspec.fixme('needs a fix', () => {});\nspec.fail.only('focused expected failure', () => {});\nspec.each([1])('unsupported collection form', () => {});\n",
    );

    expect(extractTests(filePath).map((testCase) => testCase.name)).toEqual([
      'expected failure',
      'needs a fix',
      'focused expected failure',
    ]);
  });

  it('does not treat a file-level block var expect as the global matcher', async () => {
    const filePath = await createFixture(
      'block-var-expect.test.ts',
      "import { test } from 'vitest';\nif (enabled) { var expect = localExpect; }\ntest('uses the local helper', () => {\n  expect(true).toBe(true);\n});\n",
    );
    const [testCase] = extractTests(filePath);

    expect(evaluateRules(testCase!).map((finding) => finding.ruleId)).toContain(
      'UT001',
    );
  });

  it('does not treat a file-level block var test as the global test API', async () => {
    const filePath = await createFixture(
      'block-var-test.test.ts',
      "import { expect } from 'vitest';\nif (enabled) { var test = localTest; }\ntest('not a framework test', () => { expect(true).toBe(true); });\n",
    );

    expect(extractTests(filePath)).toEqual([]);
  });

  it('does not trust a require name declared with file-level block var', async () => {
    const filePath = await createFixture(
      'block-var-require.test.js',
      "if (enabled) { var require = customRequire; }\nconst { test } = require('node:test');\ntest('not a native test', () => {});\n",
    );

    expect(extractTests(filePath)).toEqual([]);
  });

  it('identifies Playwright test callbacks as e2e without executing the source', async () => {
    const filePath = await createFixture(
      'checkout.e2e.ts',
      "import { expect, test } from '@playwright/test';\n\ntest('completes checkout', async ({ page }) => {\n  await page.goto('/checkout');\n  await expect(page).toHaveTitle('Checkout');\n});\n",
    );

    const tests = extractTests(filePath);

    expect(tests).toMatchObject([
      {
        name: 'completes checkout',
        framework: 'playwright',
        type: 'e2e',
        filePath: resolve(filePath),
        line: 3,
        source:
          "async ({ page }) => {\n  await page.goto('/checkout');\n  await expect(page).toHaveTitle('Checkout');\n}",
        body: "{\n  await page.goto('/checkout');\n  await expect(page).toHaveTitle('Checkout');\n}",
      },
    ]);
  });

  it('recognizes aliased framework test callbacks', async () => {
    const filePath = await createFixture(
      'aliased-test.test.ts',
      "import { describe as group, expect as check, test as spec } from 'vitest';\ngroup('calculator', () => {\n  spec('checks the result', () => {\n    check(2 + 2).toBe(4);\n  });\n});\n",
    );

    const tests = extractTests(filePath);
    const findings = evaluateRules(tests[0]!);

    expect(tests).toHaveLength(1);
    expect(tests[0]).toMatchObject({
      framework: 'vitest',
      name: 'calculator > checks the result',
    });
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT001');
  });

  it('does not extract a top-level local test helper as a framework test', async () => {
    const filePath = await createFixture(
      'local-test-helper.ts',
      "import { expect } from 'vitest';\nconst test = (name, callback) => callback();\ntest('not a framework test', () => {\n  expect(true).toBe(true);\n});\n",
    );

    expect(extractTests(filePath)).toHaveLength(0);
  });

  it('does not infer a framework from type-only imports', async () => {
    const filePath = await createFixture(
      'type-only-framework.test.ts',
      "import { type test } from 'vitest';\ntest('uses a global test function', () => {});\n",
    );

    expect(extractTests(filePath)).toMatchObject([
      { name: 'uses a global test function', framework: 'unknown' },
    ]);
  });

  it('recognizes aliased Jest and Vitest expect imports', async () => {
    const jestFilePath = await createFixture(
      'aliased-jest.test.ts',
      "import { expect as check, test } from '@jest/globals';\ntest('checks the result', () => {\n  check.assertions(0);\n  check(true).toBe(true);\n});\n",
    );
    const vitestFilePath = await createFixture(
      'aliased-vitest.test.ts',
      "import { expect as check, test } from 'vitest';\ntest('checks the result', () => {\n  check.assertions(0);\n  check(true).toBe(true);\n});\n",
    );

    for (const filePath of [jestFilePath, vitestFilePath]) {
      const [testCase] = extractTests(filePath);
      const findings = evaluateRules(testCase!);

      expect(findings.map((finding) => finding.ruleId)).toContain('UT002');
      expect(findings.map((finding) => finding.ruleId)).toContain('UT013');
      expect(findings.map((finding) => finding.ruleId)).not.toContain('UT001');
    }

    expect(extractTests(jestFilePath)[0]?.framework).toBe('jest');
    expect(extractTests(vitestFilePath)[0]?.framework).toBe('vitest');
  });

  it('recognizes matcher modifier chains without treating negated checks as fake', async () => {
    const filePath = await createFixture(
      'matcher-modifiers.test.ts',
      "import { expect, test } from 'vitest';\ntest('checks a negated interaction', () => {\n  expect(mock).not.toHaveBeenCalled();\n});\ntest('checks a resolved value', async () => {\n  await expect(Promise.resolve(false)).resolves.toBeTruthy();\n});\n",
    );

    const testCases = extractTests(filePath);
    const negatedRuleIds = evaluateRules(testCases[0]!).map(
      (finding) => finding.ruleId,
    );
    const resolvedRuleIds = evaluateRules(testCases[1]!).map(
      (finding) => finding.ruleId,
    );

    expect(negatedRuleIds).toContain('UT014');
    expect(negatedRuleIds).not.toContain('UT001');
    expect(negatedRuleIds).not.toContain('UT002');
    expect(negatedRuleIds).not.toContain('UT004');
    expect(resolvedRuleIds).toContain('UT004');
    expect(resolvedRuleIds).not.toContain('UT001');
  });

  it('recognizes an aliased CommonJS Vitest expect binding', async () => {
    const filePath = await createFixture(
      'aliased-commonjs-vitest.test.js',
      "const { expect: check, test } = require('vitest');\ntest('checks the result', () => {\n  check(true).toBe(true);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(testCase?.framework).toBe('vitest');
    expect(findings.map((finding) => finding.ruleId)).toContain('UT002');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT001');
  });

  it('recognizes CommonJS expect aliases from each supported matcher module', async () => {
    const cases = [
      {
        moduleName: '@jest/globals',
        framework: 'jest',
        body: 'await check(3).toBe(3);',
        ruleId: 'UT002',
      },
      {
        moduleName: 'vitest',
        framework: 'vitest',
        body: 'await check(3).toBe(3);',
        ruleId: 'UT002',
      },
      {
        moduleName: '@playwright/test',
        framework: 'playwright',
        body: 'await check(page).toBeVisible();',
        ruleId: 'E2E003',
      },
    ] as const;

    for (const [index, testCaseContract] of cases.entries()) {
      const filePath = await createFixture(
        `commonjs-expect-${index}.test.ts`,
        `const { expect: check, test: spec } = require('${testCaseContract.moduleName}');\nspec('checks the result', async () => {\n  ${testCaseContract.body}\n});\n`,
      );
      const [testCase] = extractTests(filePath);
      const findings = evaluateRules(testCase!);

      expect(testCase?.framework).toBe(testCaseContract.framework);
      expect(testCase?.expectBindings).toContain('check');
      expect(findings.map((finding) => finding.ruleId)).toContain(
        testCaseContract.ruleId,
      );
    }
  });

  it('applies API rules to an aliased matcher extracted from a test callback', async () => {
    const filePath = await createFixture(
      'aliased-api.test.ts',
      "import { expect as check, test } from 'vitest';\ntest('checks the response', () => {\n  check(response.body).toBeTruthy();\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules({ ...testCase!, type: 'api' });

    expect(findings.map((finding) => finding.ruleId)).toContain('API002');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('API001');
  });

  it('recognizes negated aliases without treating them as existence-only API checks', async () => {
    const filePath = await createFixture(
      'negated-api.test.ts',
      "import { expect as check, test } from 'vitest';\ntest('checks the response differs from the request', () => {\n  check(response.body).not.toEqual(requestBody);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules({ ...testCase!, type: 'api' });
    const ruleIds = findings.map((finding) => finding.ruleId);

    expect(ruleIds).not.toContain('API004');
    expect(ruleIds).not.toContain('API002');
  });

  it('recognizes Node native response comparisons in API checks', async () => {
    const filePath = await createFixture(
      'node-api.test.js',
      "const { test } = require('node:test');\nconst assert = require('node:assert/strict');\ntest('checks the response', () => {\n  assert.deepStrictEqual(response.body, requestBody);\n});\n",
    );
    const [testCase] = extractTests(filePath);

    expect(
      evaluateRules({ ...testCase!, type: 'api' }).map(
        (finding) => finding.ruleId,
      ),
    ).toContain('API004');
  });

  it('audits the returned expression of a simple polling assertion', async () => {
    const apiFilePath = await createFixture(
      'polled-api.test.ts',
      "import { expect, test } from 'vitest';\ntest('checks the response body', async () => {\n  await expect.poll(() => response.body).toBeTruthy();\n});\n",
    );
    const unitFilePath = await createFixture(
      'polled-literal.test.ts',
      "import { expect, test } from 'vitest';\ntest('checks a constant result', async () => {\n  await expect.poll(() => 3).toBe(3);\n});\n",
    );

    const [apiTestCase] = extractTests(apiFilePath);
    const [unitTestCase] = extractTests(unitFilePath);
    const apiRuleIds = evaluateRules({ ...apiTestCase!, type: 'api' }).map(
      (finding) => finding.ruleId,
    );
    const unitRuleIds = evaluateRules(unitTestCase!).map(
      (finding) => finding.ruleId,
    );

    expect(apiRuleIds).toContain('API002');
    expect(unitRuleIds).toContain('UT002');
    expect(unitRuleIds).not.toContain('UT003');
  });

  it('does not trust a reassigned CommonJS expect alias', async () => {
    const filePath = await createFixture(
      'reassigned-commonjs-expect.test.js',
      "const { expect: check, test } = require('vitest');\ncheck = (value) => ({ toBe: () => value });\ntest('uses a local helper', () => {\n  check(true).toBe(true);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(testCase?.framework).toBe('vitest');
    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('does not trust an expect alias assigned by a destructuring loop', async () => {
    const filePath = await createFixture(
      'destructured-expect-assignment.test.ts',
      "import { expect as check, test } from 'vitest';\nfor ({ check } of helpers) {}\ntest('uses reassigned helper', () => { check(1).toBe(1); });\n",
    );
    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('does not treat a locally shadowed expect alias as a framework matcher', async () => {
    const filePath = await createFixture(
      'shadowed-expect-alias.test.ts',
      "import { expect as check, test } from 'vitest';\ntest('uses a local helper', () => {\n  const check = (value) => value;\n  check(true).toBe(true);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('does not treat a locally shadowed global expect as a framework matcher', async () => {
    const filePath = await createFixture(
      'shadowed-global-expect.test.ts',
      "import { test } from 'vitest';\ntest('uses a local helper', () => {\n  function expect(value) { return { toBe() { return value; } }; }\n  expect(true).toBe(true);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('does not treat a top-level local expect as a framework matcher', async () => {
    const filePath = await createFixture(
      'shadowed-top-level-expect.test.ts',
      "import { test } from 'vitest';\nconst expect = (value) => ({ toBe: () => value });\ntest('uses a local helper', () => {\n  expect(true).toBe(true);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('recognizes an aliased unawaited Playwright matcher', async () => {
    const filePath = await createFixture(
      'aliased-playwright.e2e.ts',
      "import { expect as check, test } from '@playwright/test';\ntest('checks the page', async ({ page }) => {\n  check(page).toHaveTitle('Checkout');\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).not.toContain('E2E001');
    expect(findings.map((finding) => finding.ruleId)).toContain('E2E008');
  });

  it('recognizes Playwright soft and polling assertions with matcher modifiers', async () => {
    const filePath = await createFixture(
      'playwright-soft-poll.e2e.ts',
      "import { expect as check, test } from '@playwright/test';\ntest('checks soft and polled outcomes', async ({ page }) => {\n  check.soft(page).not.toBeVisible();\n  check.poll(() => page.title()).toBe('Checkout');\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);
    const ruleIds = findings.map((finding) => finding.ruleId);

    expect(ruleIds).not.toContain('E2E001');
    expect(ruleIds).not.toContain('E2E003');
    expect(
      findings
        .filter((finding) => finding.ruleId === 'E2E008')
        .map((finding) => finding.line),
    ).toEqual([3, 4]);
  });

  it('identifies Node test callbacks as Node native tests', async () => {
    const filePath = await createFixture(
      'native.test.js',
      "import test from 'node:test';\nimport assert from 'node:assert/strict';\n\ntest('adds numbers', () => {\n  assert.strictEqual(1 + 2, 3);\n});\n",
    );

    expect(extractTests(filePath)).toMatchObject([
      {
        name: 'adds numbers',
        framework: 'node-test',
        type: 'unknown',
      },
    ]);
  });

  it('does not treat an unbound expect global in node:test as an assertion', async () => {
    const filePath = await createFixture(
      'node-test-unbound-expect.test.js',
      "import test from 'node:test';\ntest('uses no recognized assertion', () => { expect(true).toBe(true); });\n",
    );
    const [testCase] = extractTests(filePath);

    expect(testCase?.expectBindings).not.toContain('expect');
    expect(evaluateRules(testCase!).map((finding) => finding.ruleId)).toContain(
      'UT001',
    );
  });

  it('recognizes the Node strict assertion export as a namespace binding', async () => {
    const filePath = await createFixture(
      'strict-export-native.test.js',
      "import test from 'node:test';\nimport { strict as assert } from 'node:assert';\ntest('adds numbers', () => assert.strictEqual(1, 1));\n",
    );
    const [testCase] = extractTests(filePath);

    expect(testCase?.nativeAssertionBindings).toEqual([
      { localName: 'assert', kind: 'namespace' },
    ]);
    expect(evaluateRules(testCase!).map((finding) => finding.ruleId)).toEqual([
      'UT002',
    ]);
  });

  it('does not treat a CommonJS object rest binding as callable Node assert', async () => {
    const filePath = await createFixture(
      'commonjs-rest-assert.test.js',
      "import test from 'node:test';\nconst { ...assert } = require('node:assert');\ntest('does not call an assertion function', () => assert(1));\n",
    );
    const [testCase] = extractTests(filePath);

    expect(testCase?.nativeAssertionBindings ?? []).toEqual([]);
    expect(evaluateRules(testCase!).map((finding) => finding.ruleId)).toContain(
      'UT001',
    );
  });

  it('recognizes statically required Node tests and assertions', async () => {
    const filePath = await createFixture(
      'commonjs-native.test.js',
      "const { test } = require('node:test');\nconst { strictEqual: equal } = require('node:assert/strict');\n\ntest('adds numbers', () => {\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);

    expect(testCase).toMatchObject({
      framework: 'node-test',
      nativeAssertionBindings: [
        { localName: 'equal', kind: 'method', methodName: 'strictEqual' },
      ],
    });
    expect(evaluateRules(testCase!).map((finding) => finding.ruleId)).toEqual([
      'UT002',
    ]);
  });

  it('does not treat a shadowed require function as a Node assertion module', async () => {
    const filePath = await createFixture(
      'shadowed-require-native.test.ts',
      "import test from 'node:test';\nconst require = (name) => ({ strictEqual: (actual, expected) => actual === expected });\nconst { strictEqual: equal } = require('node:assert/strict');\ntest('uses a local require helper', () => {\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(testCase?.nativeAssertionBindings).toBeUndefined();
    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('does not infer a framework from a reassigned require function', async () => {
    const filePath = await createFixture(
      'reassigned-require.test.js',
      "require = (name) => ({ expect: (value) => ({ toBe: () => value }) });\nconst { expect: check } = require('vitest');\ntest('uses a local require helper', () => {\n  check(true).toBe(true);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(testCase?.framework).toBe('unknown');
    expect(testCase?.expectBindings).not.toContain('check');
    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('preserves direct Node assertion bindings for rule recognition', async () => {
    const filePath = await createFixture(
      'named-native.test.js',
      "import test from 'node:test';\nimport { strictEqual as equal } from 'node:assert/strict';\n\ntest('adds numbers', () => {\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);

    expect(testCase).toMatchObject({
      nativeAssertionBindings: [
        { localName: 'equal', kind: 'method', methodName: 'strictEqual' },
      ],
    });
    expect(evaluateRules(testCase!).map((finding) => finding.ruleId)).toEqual([
      'UT002',
    ]);
  });

  it('does not treat type-only Node assertion imports as runtime bindings', async () => {
    const filePath = await createFixture(
      'type-only-native.test.ts',
      "import test from 'node:test';\nimport { type strictEqual as equal } from 'node:assert/strict';\n\ntest('does not have a runtime assertion binding', () => {\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('does not apply an imported assertion binding when shadowed in the callback', async () => {
    const filePath = await createFixture(
      'shadowed-native.test.ts',
      "import test from 'node:test';\nimport { strictEqual as equal } from 'node:assert/strict';\n\ntest('uses a local helper', (equal) => {\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);

    expect(evaluateRules(testCase!).map((finding) => finding.ruleId)).toContain(
      'UT001',
    );
    expect(
      evaluateRules(testCase!).map((finding) => finding.ruleId),
    ).not.toContain('UT002');
  });

  it('does not apply an imported assertion binding shadowed by a local declaration', async () => {
    const filePath = await createFixture(
      'local-shadow-native.test.ts',
      "import test from 'node:test';\nimport { strictEqual as equal } from 'node:assert/strict';\n\ntest('uses a local helper', () => {\n  const equal = (left, right) => left === right;\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('does not trust a mutable CommonJS assertion binding after reassignment', async () => {
    const filePath = await createFixture(
      'reassigned-native.test.js',
      "const { test } = require('node:test');\nlet { strictEqual: equal } = require('node:assert/strict');\n\ntest('uses a reassigned helper', () => {\n  equal = (actual, expected) => actual === expected;\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('does not trust a CommonJS assertion binding after an update expression', async () => {
    const filePath = await createFixture(
      'updated-native.test.js',
      "const { test } = require('node:test');\nlet { strictEqual: equal } = require('node:assert/strict');\nequal++;\ntest('uses the overwritten binding', () => {\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('keeps a CommonJS assertion binding when a nested helper reassigns a shadow', async () => {
    const filePath = await createFixture(
      'shadowed-reassigned-native.test.js',
      "const { test } = require('node:test');\nconst { strictEqual: equal } = require('node:assert/strict');\nfunction replace(equal) { equal = (actual, expected) => actual === expected; }\ntest('keeps the imported assertion', () => {\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(
      findings.filter((finding) => finding.ruleId === 'UT002'),
    ).toHaveLength(1);
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT001');
  });

  it('keeps a CommonJS assertion binding when a nested helper updates a shadow', async () => {
    const filePath = await createFixture(
      'shadowed-updated-native.test.js',
      "const { test } = require('node:test');\nconst { strictEqual: equal } = require('node:assert/strict');\nfunction replace(equal) { equal++; }\ntest('keeps the imported assertion', () => {\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(
      findings.filter((finding) => finding.ruleId === 'UT002'),
    ).toHaveLength(1);
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT001');
  });

  it('keeps a CommonJS assertion binding when a nested helper iterates over a shadow', async () => {
    const filePath = await createFixture(
      'shadowed-iterated-native.test.js',
      "const { test } = require('node:test');\nconst { strictEqual: equal } = require('node:assert/strict');\nfunction replace(equal) { for (equal of []) {} }\ntest('keeps the imported assertion', () => {\n  equal(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(
      findings.filter((finding) => finding.ruleId === 'UT002'),
    ).toHaveLength(1);
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT001');
  });

  it('keeps a CommonJS assertion namespace when a nested helper replaces a shadow', async () => {
    const filePath = await createFixture(
      'shadowed-mutated-native-namespace.test.js',
      "const { test } = require('node:test');\nconst assert = require('node:assert/strict');\nfunction replace(assert) { assert.strictEqual = (actual, expected) => actual === expected; }\ntest('keeps the imported assertion', () => {\n  assert.strictEqual(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(
      findings.filter((finding) => finding.ruleId === 'UT002'),
    ).toHaveLength(1);
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT001');
  });

  it('does not trust a CommonJS assertion namespace after method replacement', async () => {
    const filePath = await createFixture(
      'mutated-native-namespace.test.js',
      "const { test } = require('node:test');\nconst assert = require('node:assert/strict');\nassert.strictEqual = (actual, expected) => actual === expected;\n\ntest('uses a replaced helper', () => {\n  assert.strictEqual(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('does not treat a file-scope custom assert object as Node native assert', async () => {
    const filePath = await createFixture(
      'file-scope-assert.test.ts',
      "import test from 'node:test';\nconst assert = { strictEqual: (actual, expected) => actual === expected };\n\ntest('uses a local assert helper', () => {\n  assert.strictEqual(3, 3);\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('does not use an imported assertion binding shadowed around the test call', async () => {
    const filePath = await createFixture(
      'outer-scope-shadow-native.test.ts',
      "import test from 'node:test';\nimport { strictEqual as equal } from 'node:assert/strict';\n\nif (useLocalHelper) {\n  const equal = (actual, expected) => actual === expected;\n  test('uses a block-scoped helper', () => {\n    equal(3, 3);\n  });\n}\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('keeps imported assertions in scope outside a nested shadow', async () => {
    const filePath = await createFixture(
      'nested-shadow-native.test.ts',
      "import test from 'node:test';\nimport { strictEqual as equal } from 'node:assert/strict';\n\ntest('keeps scopes separate', () => {\n  equal(3, 3);\n  function helper(equal) {\n    equal(4, 4);\n  }\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(
      findings.filter((finding) => finding.ruleId === 'UT002'),
    ).toHaveLength(1);
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT001');
  });

  it('respects lexical declarations across switch clauses', async () => {
    const filePath = await createFixture(
      'switch-shadow-native.test.ts',
      "import test from 'node:test';\nimport { strictEqual as equal } from 'node:assert/strict';\n\ntest('keeps switch clause bindings in scope', () => {\n  switch (branch) {\n    case 'assert':\n      equal(3, 3);\n      break;\n    default:\n      const equal = localHelper;\n  }\n});\n",
    );

    const [testCase] = extractTests(filePath);
    const findings = evaluateRules(testCase!);

    expect(findings.map((finding) => finding.ruleId)).toContain('UT001');
    expect(findings.map((finding) => finding.ruleId)).not.toContain('UT002');
  });

  it('uses the callback start line as the location baseline', async () => {
    const filePath = await createFixture(
      'multiline.test.ts',
      "import { test } from 'vitest';\n\ntest(\n  'multiline callback',\n  () => {\n    expect(true).toBe(true);\n  },\n);\n",
    );

    expect(extractTests(filePath)).toMatchObject([
      {
        name: 'multiline callback',
        line: 5,
      },
    ]);
  });

  it('extracts parameterized tests and nested suite context', async () => {
    const filePath = await createFixture(
      'matrix.test.ts',
      "import { describe, test } from 'vitest';\n\ndescribe('calculator', () => {\n  test.each([[1, 2]])('adds %i and %i', (left, right) => {\n    expect(left + right).toBe(3);\n  });\n});\n",
    );

    expect(extractTests(filePath)).toMatchObject([
      { name: 'calculator > adds %i and %i', framework: 'vitest', line: 4 },
    ]);
  });

  it('returns parser diagnostics without executing invalid source', async () => {
    const filePath = await createFixture(
      'broken.test.ts',
      "import { test } from 'vitest'; test('broken', () => {",
    );

    expect(extractTestsWithDiagnostics(filePath).diagnostics).toHaveLength(1);
  });
});
