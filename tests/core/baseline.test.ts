import { describe, expect, it } from 'vitest';
import {
  BaselineError,
  compareBaseline,
  parseBaseline,
} from '../../src/core/baseline';
import type { Finding } from '../../src/core/types';

const finding: Finding = {
  ruleId: 'UT002',
  severity: 'CRITICAL',
  classification: 'FAKE',
  confidence: 'HIGH',
  filePath: '/checkout/tests/example.test.ts',
  line: 12,
  message: 'same',
  remediation: 'fix',
};

describe('baseline', () => {
  it('parses a version 1 baseline and compares root-relative finding identities', () => {
    const baseline = parseBaseline({
      version: '1',
      id: 'main',
      findings: [
        {
          ruleId: 'UT002',
          filePath: 'tests/example.test.ts',
          line: 12,
          classification: 'FAKE',
          severity: 'CRITICAL',
        },
      ],
    });

    expect(compareBaseline(baseline, [finding], '/checkout')).toEqual({
      version: '1',
      id: 'main',
      historicalFindingCount: 1,
      newFindingCount: 0,
    });
  });

  it.each([
    {},
    { version: '2', id: 'main', findings: [] },
    { version: '1', id: '', findings: [] },
    {
      version: '1',
      id: 'main',
      findings: [
        {
          ruleId: 'UT002',
          filePath: '../x.test.ts',
          line: 1,
          classification: 'FAKE',
          severity: 'CRITICAL',
        },
      ],
    },
    {
      version: '1',
      id: 'main',
      findings: [
        {
          ruleId: 'UT002',
          filePath: 'C:\\checkout\\x.test.ts',
          line: 1,
          classification: 'FAKE',
          severity: 'CRITICAL',
        },
      ],
    },
  ])('rejects an invalid baseline', (value) => {
    expect(() => parseBaseline(value)).toThrow(BaselineError);
  });
});
