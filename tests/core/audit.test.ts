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
});
