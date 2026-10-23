import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { auditPath, auditTestCases } from '../../src/core/audit';
import type { TestCase } from '../../src/core/types';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

function testCase(name: string, body: string): TestCase {
  return {
    filePath: `tests/${name}.test.ts`,
    name,
    framework: 'vitest',
    type: 'unit',
    line: 1,
    source: `() => ${body}`,
    body,
  };
}

describe('auditTestCases', () => {
  it('classifies each test once and calculates FTR from assessed tests only', () => {
    const result = auditTestCases([
      testCase('fake', '{ expect(true).toBe(true); }'),
      {
        ...testCase('weak', '{ expect(response.status).toBe(200); }'),
        type: 'api',
      },
      testCase('unassessed', "{ expect(result).toBe('ready'); }"),
    ]);

    expect(result.summary).toMatchObject({
      total: 3,
      assessed: 2,
      fake: 1,
      weak: 1,
      invalid: 0,
      unassessed: 1,
      fakeTestRatio: 50,
    });
  });

  it('deducts per finding using the published formula and floors the score at zero', () => {
    const result = auditTestCases([
      testCase(
        'many-findings',
        '{ try { run(); } catch {} expect(1).toBe(1); expect(2).toBe(2); expect(3).toBe(3); expect(4).toBe(4); }',
      ),
    ]);

    expect(result.findings).toHaveLength(5);
    expect(result.summary.trustScore).toBe(0);
  });

  it('returns a neutral FTR and score when there are no assessed tests', () => {
    const result = auditTestCases([
      testCase('unassessed', "{ expect(result).toBe('ready'); }"),
    ]);

    expect(result.summary).toMatchObject({
      assessed: 0,
      fakeTestRatio: 0,
      trustScore: 100,
      unassessed: 1,
    });
  });

  it('uses matcher bindings internally without adding them to the audit schema', () => {
    const result = auditTestCases([
      {
        ...testCase('aliased-matcher', '{ check(true).toBe(true); }'),
        expectBindings: ['check'],
      },
    ]);

    expect(result.findings.map((finding) => finding.ruleId)).toContain('UT002');
    expect(result.tests[0]).not.toHaveProperty('expectBindings');
    expect(JSON.stringify(result)).not.toContain('expectBindings');
  });

  it('recognizes assertions executed by a fast-check property', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'fast-check.test.ts');
    await writeFile(
      filePath,
      "import { expect, test } from 'vitest';\nimport fc from 'fast-check';\ntest('property assertion', () => {\n  fc.assert(fc.property(fc.integer(), (value) => {\n    expect(value).toBeGreaterThanOrEqual(0);\n  }));\n});\n",
    );

    const result = await auditPath(filePath);

    expect(result.findings.map((finding) => finding.ruleId)).not.toContain(
      'UT001',
    );
    expect(result.tests[0]).not.toHaveProperty('analysisContext');
  });

  it('does not assume fast-check executes a property with zero runs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'fast-check-zero-runs.test.ts');
    await writeFile(
      filePath,
      "import { expect, test } from 'vitest';\nimport fc from 'fast-check';\ntest('property is configured not to run', () => {\n  fc.assert(fc.property(fc.integer(), (value) => expect(value).toBeGreaterThanOrEqual(0)), { numRuns: 0 });\n});\n",
    );

    const result = await auditPath(filePath);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'UT001',
        classification: 'FAKE',
      }),
    );
  });

  it('recognizes a fast-check property with an explicit positive run count', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'fast-check-positive-runs.test.ts');
    await writeFile(
      filePath,
      "import { expect, test } from 'vitest';\nimport fc from 'fast-check';\ntest('property has positive runs', () => {\n  fc.assert(fc.property(fc.integer(), (value) => expect(value).toBeGreaterThanOrEqual(0)), { numRuns: 3 });\n});\n",
    );

    const result = await auditPath(filePath);

    expect(result.findings.map((finding) => finding.ruleId)).not.toContain(
      'UT001',
    );
  });

  it('downgrades an assertion hidden in an opaque collection callback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'opaque-for-each.test.ts');
    await writeFile(
      filePath,
      "import { expect, test } from 'vitest';\ntest('checks returned values', () => {\n  const values = loadValues();\n  values.forEach((value) => expect(value).toBe('expected'));\n});\n",
    );

    const result = await auditPath(filePath);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'UT001',
        classification: 'WEAK',
        severity: 'WARNING',
      }),
    );
  });

  it('downgrades an assertion nested in opaque collection callbacks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'nested-opaque-for-each.test.ts');
    await writeFile(
      filePath,
      "import { expect, test } from 'vitest';\ntest('checks nested returned values', () => {\n  const routes = loadRoutes();\n  routes.forEach((route) => {\n    route.entries.forEach((entry) => expect(entry).toBe('expected'));\n  });\n});\n",
    );

    const result = await auditPath(filePath);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'UT001',
        classification: 'WEAK',
        severity: 'WARNING',
      }),
    );
  });

  it('recognizes assertions in a called helper from an enclosing test suite', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'suite-helper.spec.ts');
    await writeFile(
      filePath,
      "import { expect, test } from '@playwright/test';\ntest.describe('SEO', () => {\n  const expectCanonical = async (page: unknown) => {\n    await expect(page).toHaveURL('/en/');\n  };\n  test('canonical URL', async ({ page }) => {\n    await expectCanonical(page);\n  });\n});\n",
    );

    const result = await auditPath(filePath);

    expect(result.findings.map((finding) => finding.ruleId)).not.toContain(
      'E2E001',
    );
    expect(result.findings.map((finding) => finding.ruleId)).toContain(
      'E2E002',
    );
  });

  it('downgrades a Playwright assertion hidden in an opaque collection callback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'opaque-for-each.spec.ts');
    await writeFile(
      filePath,
      "import { expect, test } from '@playwright/test';\ntest('checks link labels', async ({ page }) => {\n  const links = findLinks(page);\n  links.forEach((link) => expect(link).toHaveText('Learn more'));\n});\n",
    );

    const result = await auditPath(filePath);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'E2E001',
        classification: 'WEAK',
        severity: 'WARNING',
      }),
    );
  });

  it('does not treat conditional test registration as a conditional assertion', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'conditional-registration.spec.ts');
    await writeFile(
      filePath,
      "import { expect, test } from '@playwright/test';\nif (process.env.LOCALE) {\n  test('locale journey', async ({ page }) => {\n    await expect(page).toHaveURL('/en/');\n  });\n}\n",
    );

    const result = await auditPath(filePath);

    expect(result.findings.map((finding) => finding.ruleId)).not.toContain(
      'E2E007',
    );
  });

  it('keeps E2E007 for a condition inside the journey callback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'conditional-assertion.spec.ts');
    await writeFile(
      filePath,
      "import { expect, test } from '@playwright/test';\ntest('conditional journey outcome', async ({ page }) => {\n  if (page.url() !== '/') {\n    await expect(page).toHaveURL('/en/');\n  }\n});\n",
    );

    const result = await auditPath(filePath);

    expect(result.findings.map((finding) => finding.ruleId)).toContain(
      'E2E007',
    );
  });

  it('does not count an uncalled helper from an enclosing test suite', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'suite-helper.spec.ts');
    await writeFile(
      filePath,
      "import { expect, test } from '@playwright/test';\ntest.describe('SEO', () => {\n  const expectCanonical = async (page: unknown) => {\n    await expect(page).toHaveURL('/en/');\n  };\n  test('navigates without checking', async ({ page }) => {\n    await page.goto('/en/');\n  });\n});\n",
    );

    const result = await auditPath(filePath);

    expect(result.findings.map((finding) => finding.ruleId)).toContain(
      'E2E001',
    );
  });

  it('keeps sibling test callbacks isolated when analyzing a full source file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'sibling-tests.test.ts');
    await writeFile(
      filePath,
      "import { expect, test } from 'vitest';\ntest('without assertion', () => { run(); });\ntest('with assertion', () => { expect(run()).toBeTruthy(); });\n",
    );

    const result = await auditPath(filePath);
    const missingAssertionFindings = result.findings.filter(
      (finding) => finding.ruleId === 'UT001',
    );

    expect(missingAssertionFindings).toHaveLength(1);
    expect(missingAssertionFindings[0]?.line).toBe(2);
  });

  it('turns source parser diagnostics into INVALID audit findings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'broken.test.ts');
    await writeFile(filePath, 'const = ;');

    const result = await auditPath(filePath);

    expect(result.findings).toMatchObject([
      {
        ruleId: 'PARSER001',
        classification: 'INVALID',
        severity: 'WARNING',
        filePath,
      },
    ]);
    expect(result.summary).toMatchObject({
      total: 1,
      assessed: 1,
      invalid: 1,
      unassessed: 0,
    });
  });

  it('attaches advisory policy evaluation without changing static findings or summary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'fake.test.ts');
    const policyPath = join(root, 'policy.json');
    await writeFile(
      filePath,
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );
    await writeFile(
      policyPath,
      '{"version":"1","id":"local-policy","mode":"advisory","disabledRuleIds":["UT002"]}',
    );

    const withoutPolicy = await auditPath(filePath);
    const withPolicy = await auditPath(filePath, { policyPath });

    expect(withoutPolicy.policy).toBeUndefined();
    expect(withPolicy).toMatchObject({
      findings: withoutPolicy.findings,
      summary: withoutPolicy.summary,
      policy: {
        id: 'local-policy',
        disabledFindingCount: 1,
        activeFindingCount: 0,
      },
    });
  });

  it('does not attach policy when auditPath receives no policyPath', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'unassessed.test.ts');
    await writeFile(
      filePath,
      "import { expect, test } from 'vitest'; test('ok', () => { expect(value).toBe('ok'); });",
    );

    expect((await auditPath(filePath)).policy).toBeUndefined();
  });

  it('attaches baseline counts without changing static findings or summary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'fake.test.ts');
    const baselinePath = join(root, 'baseline.json');
    await writeFile(
      filePath,
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );
    await writeFile(
      baselinePath,
      JSON.stringify({
        version: '1',
        id: 'main',
        findings: [
          {
            ruleId: 'UT002',
            filePath: 'fake.test.ts',
            line: 1,
            classification: 'FAKE',
            severity: 'CRITICAL',
          },
        ],
      }),
    );

    const withoutBaseline = await auditPath(filePath);
    const withBaseline = await auditPath(filePath, { baselinePath });
    expect(withBaseline).toMatchObject({
      findings: withoutBaseline.findings,
      summary: withoutBaseline.summary,
      baseline: { id: 'main', historicalFindingCount: 1, newFindingCount: 0 },
    });
  });

  it('attaches policy after converting parser diagnostics to INVALID findings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-audit-'));
    temporaryRoots.push(root);
    const filePath = join(root, 'broken.test.ts');
    const policyPath = join(root, 'policy.json');
    await writeFile(filePath, 'const = ;');
    await writeFile(
      policyPath,
      '{"version":"1","id":"local-policy","mode":"advisory","disabledRuleIds":["UT002"]}',
    );

    const result = await auditPath(filePath, { policyPath });

    expect(result).toMatchObject({
      findings: [{ ruleId: 'PARSER001', classification: 'INVALID' }],
      summary: { invalid: 1 },
      policy: {
        id: 'local-policy',
        disabledFindingCount: 0,
        activeFindingCount: 1,
      },
    });
  });
});
