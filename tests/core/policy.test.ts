import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  evaluatePolicy,
  loadPolicy,
  parsePolicy,
  PolicyError,
} from '../../src/core/policy';
import { auditTestCases } from '../../src/core/audit';
import type { Finding, TestCase } from '../../src/core/types';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

const fakeFinding: Finding = {
  ruleId: 'UT001',
  severity: 'CRITICAL',
  classification: 'FAKE',
  confidence: 'HIGH',
  filePath: 'tests/example.test.ts',
  line: 4,
  message: 'UT001 no assertion',
  remediation: 'Add a meaningful assertion.',
};

describe('audit policy contract', () => {
  it('accepts an advisory v1 policy and evaluates disabled findings', () => {
    const policy = parsePolicy({
      version: '1',
      id: 'team-baseline',
      mode: 'advisory',
      disabledRuleIds: ['UT001'],
    });

    expect(
      evaluatePolicy(policy, [
        fakeFinding,
        { ...fakeFinding, ruleId: 'UT004' },
      ]),
    ).toEqual({
      id: 'team-baseline',
      version: '1',
      mode: 'advisory',
      disabledRuleIds: ['UT001'],
      disabledFindingCount: 1,
      activeFindingCount: 1,
    });
  });

  it('defaults omitted disabled rule IDs to an empty list', () => {
    expect(
      parsePolicy({ version: '1', id: 'default', mode: 'advisory' }),
    ).toEqual({
      version: '1',
      id: 'default',
      mode: 'advisory',
      disabledRuleIds: [],
    });
  });

  it.each([
    { version: '2', id: 'policy', mode: 'advisory' },
    { version: '1', id: '', mode: 'advisory' },
    { version: '1', id: 'policy', mode: 'enforcing' },
    {
      version: '1',
      id: 'policy',
      mode: 'advisory',
      disabledRuleIds: ['UT001', 'UT001'],
    },
    { version: '1', id: 'policy', mode: 'advisory', disabledRuleIds: [''] },
    {
      version: '1',
      id: 'policy',
      mode: 'advisory',
      disabledRuleIds: ['UT001', 2],
    },
    {
      version: '1',
      id: 'policy',
      mode: 'advisory',
      disabledRuleIds: ['UTO02'],
    },
  ])('rejects unsupported or malformed policies', (policy) => {
    expect(() => parsePolicy(policy)).toThrow(PolicyError);
  });

  it('normalizes malformed and unreadable policy files to PolicyError', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-policy-'));
    temporaryRoots.push(root);
    const malformed = join(root, 'malformed.json');
    await writeFile(malformed, '{');

    await expect(loadPolicy(malformed)).rejects.toThrow(PolicyError);
    await expect(loadPolicy(join(root, 'missing.json'))).rejects.toThrow(
      PolicyError,
    );
  });

  it('counts disabled findings without mutating or reclassifying a FAKE finding', () => {
    const policy = parsePolicy({
      version: '1',
      id: 'exception',
      mode: 'advisory',
      disabledRuleIds: ['UT001'],
    });

    const evaluation = evaluatePolicy(policy, [fakeFinding]);

    expect(evaluation).toMatchObject({
      disabledFindingCount: 1,
      activeFindingCount: 0,
    });
    expect(fakeFinding).toEqual(
      expect.objectContaining({ classification: 'FAKE' }),
    );
  });

  it('does not alter static audit summary values when evaluating a disabled UT002 finding', () => {
    const result = auditTestCases([
      {
        filePath: 'tests/example.test.ts',
        name: 'literal assertion',
        framework: 'vitest',
        type: 'unit',
        line: 10,
        source: '() => { expect(200).toBe(200); }',
        body: '{ expect(200).toBe(200); }',
      } satisfies TestCase,
    ]);
    const summary = { ...result.summary };
    const policy = parsePolicy({
      version: '1',
      id: 'exception',
      mode: 'advisory',
      disabledRuleIds: ['UT002'],
    });

    evaluatePolicy(policy, result.findings);

    expect(result.findings).toContainEqual(
      expect.objectContaining({ ruleId: 'UT002', classification: 'FAKE' }),
    );
    expect(result.summary).toEqual(summary);
    expect(result.summary.fakeTestRatio).toBe(summary.fakeTestRatio);
    expect(result.summary.trustScore).toBe(summary.trustScore);
  });
});
