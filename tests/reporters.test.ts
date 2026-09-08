import { describe, expect, it } from 'vitest';
import { renderJson, renderText } from '../src/reporters';
import type { AuditResult } from '../src/core/types';

const result: AuditResult = {
  tests: [
    {
      filePath: '/repo/example.test.ts',
      name: 'example',
      framework: 'vitest',
      type: 'unit',
      line: 4,
      source: '() => { expect(true).toBe(true); }',
      body: '{ expect(true).toBe(true); }',
    },
  ],
  findings: [
    {
      ruleId: 'UT002',
      severity: 'CRITICAL',
      classification: 'FAKE',
      confidence: 'HIGH',
      filePath: '/repo/example.test.ts',
      line: 4,
      message: 'The same literal appears on both sides.',
      remediation: 'Use an independent expected value.',
    },
  ],
  summary: {
    total: 1,
    assessed: 1,
    fake: 1,
    weak: 0,
    invalid: 0,
    unassessed: 0,
    fakeTestRatio: 100,
    trustScore: 75,
  },
};

describe('reporters', () => {
  it('renders findings and transparent FTR and score formulas as text', () => {
    const output = renderText(result);

    expect(output).toContain('Fake Test Ratio: 100.00% (1 / 1 assessed)');
    expect(output).toContain(
      'Trust Score: 75/100 (100 - 1 critical x 25 - 0 warning x 10)',
    );
    expect(output).toContain('/repo/example.test.ts:4');
    expect(output).toContain('[CRITICAL] [FAKE] UT002');
    expect(output).toContain('Static source analysis only');
  });

  it('warns that no findings do not make tests strong', () => {
    const output = renderText({
      tests: result.tests,
      findings: [],
      summary: {
        ...result.summary,
        assessed: 0,
        fake: 0,
        unassessed: 1,
        fakeTestRatio: 0,
        trustScore: 100,
      },
    });

    expect(output).toContain('UNASSESSED');
    expect(output).toContain('not evidence that they are STRONG');
  });

  it('distinguishes parser audit items from extracted test cases', () => {
    const output = renderText({
      tests: [],
      findings: [
        {
          ruleId: 'PARSER001',
          severity: 'WARNING',
          classification: 'INVALID',
          confidence: 'HIGH',
          filePath: '/repo/broken.test.ts',
          line: 1,
          message: 'Source syntax is invalid.',
          remediation: 'Fix the syntax.',
        },
      ],
      summary: {
        total: 1,
        assessed: 1,
        fake: 0,
        weak: 0,
        invalid: 1,
        unassessed: 0,
        fakeTestRatio: 0,
        trustScore: 90,
      },
    });

    expect(output).toContain('Audit items: 1 total, 1 assessed');
    expect(output).toContain('Extracted test cases: 0');
  });

  it('renders the complete audit result as parseable JSON', () => {
    expect(JSON.parse(renderJson(result))).toEqual(result);
  });

  it('renders mutation evidence as advisory only', () => {
    const output = renderText({
      ...result,
      mutation: {
        version: '1',
        engine: 'stryker',
        command: 'npx stryker run',
        threshold: {
          minimumScore: 90,
          source: 'stryker.conf.json: thresholds.high',
        },
        result: { totalMutants: 10, killed: 8, survived: 2, score: 80 },
        meetsThreshold: false,
      },
    });

    expect(output).toContain('Mutation evidence (advisory only)');
    expect(output).toContain('Threshold: below (90.00%)');
    expect(output).toContain('stryker.conf.json: thresholds.high');
  });

  it('renders a met mutation threshold without making it a static finding', () => {
    const output = renderText({
      ...result,
      mutation: {
        version: '1',
        engine: 'generic',
        command: 'mutation-tool --report report.json',
        threshold: { minimumScore: 80, source: 'policy.json' },
        result: { totalMutants: 10, killed: 8, survived: 2, score: 80 },
        meetsThreshold: true,
      },
    });

    expect(output).toContain('Threshold: met (80.00%)');
    expect(output).toContain('[CRITICAL] [FAKE] UT002');
  });

  it('renders advisory policy counts with the stable text labels', () => {
    const output = renderText({
      ...result,
      policy: {
        version: '1',
        id: 'local-policy',
        mode: 'advisory',
        disabledRuleIds: ['UT002'],
        disabledFindingCount: 1,
        activeFindingCount: 0,
      },
    });

    expect(output).toContain(
      '\nPolicy (advisory only)\nID: local-policy\nDisabled findings: 1\nActive findings: 0\n\nStatic source analysis only:',
    );
  });

  it('renders advisory baseline counts without changing findings', () => {
    const output = renderText({
      ...result,
      baseline: {
        version: '1',
        id: 'main',
        historicalFindingCount: 1,
        newFindingCount: 0,
      },
    });
    expect(output).toContain(
      'Baseline (advisory only)\nID: main\nHistorical findings: 1\nNew findings: 0',
    );
  });
});
