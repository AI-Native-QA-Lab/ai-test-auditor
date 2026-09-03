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

  it('renders the complete audit result as parseable JSON', () => {
    expect(JSON.parse(renderJson(result))).toEqual(result);
  });
});
