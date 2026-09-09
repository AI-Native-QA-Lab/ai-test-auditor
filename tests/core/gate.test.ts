import { describe, expect, it } from 'vitest';
import { createGateResult, GateError } from '../../src/core/gate';
import { parseDecisionEnvelope } from '../../src/core/decision';
import { parseGatePolicy } from '../../src/core/gate-policy';

const policy = parseGatePolicy({
  version: '1',
  id: 'repository-static-fake-gate',
  mode: 'gate',
  blockOn: ['FAKE'],
});

const testCase = {
  filePath: 'tests/example.test.ts',
  name: 'example',
  framework: 'vitest',
  type: 'unit',
  line: 1,
  source: '() => { expect(true).toBe(true); }',
  body: '{ expect(true).toBe(true); }',
};

function envelope(
  findings: readonly Record<string, unknown>[],
  summary: Record<string, unknown>,
) {
  return {
    version: '1',
    audit: {
      tests: findings.some((finding) => finding.ruleId !== 'PARSER001')
        ? [testCase]
        : [],
      findings,
      summary,
      policy: { version: '1', id: 'advisory-policy', mode: 'advisory' },
      baseline: { version: '1', id: 'main' },
    },
  };
}

describe('explicit FAKE-only gate', () => {
  it('blocks a validated FAKE snapshot without source details', () => {
    const result = createGateResult(
      policy,
      parseDecisionEnvelope(
        envelope(
          [
            {
              ruleId: 'UT002',
              severity: 'CRITICAL',
              classification: 'FAKE',
              confidence: 'HIGH',
              filePath: testCase.filePath,
              line: 1,
              message: 'Literal assertion.',
              remediation: 'Use an independent expected value.',
            },
          ],
          {
            total: 1,
            assessed: 1,
            fake: 1,
            weak: 0,
            invalid: 0,
            unassessed: 0,
            fakeTestRatio: 100,
            trustScore: 75,
          },
        ),
      ),
    );

    expect(result).toEqual({
      version: '1',
      mode: 'gate',
      status: 'blocked',
      reasonCodes: ['STATIC_FAKE_FINDINGS'],
      staticSummary: { fake: 1, weak: 0, invalid: 0 },
      policyId: 'repository-static-fake-gate',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /source|body|filePath|findings|fakeTestRatio|trustScore/,
    );
  });

  it('passes WEAK-only and unflagged snapshots', () => {
    const weak = createGateResult(
      policy,
      parseDecisionEnvelope(
        envelope(
          [
            {
              ruleId: 'UT004',
              severity: 'WARNING',
              classification: 'WEAK',
              confidence: 'MEDIUM',
              filePath: testCase.filePath,
              line: 1,
              message: 'Weak assertion.',
              remediation: 'Assert an observable value.',
            },
          ],
          {
            total: 1,
            assessed: 1,
            fake: 0,
            weak: 1,
            invalid: 0,
            unassessed: 0,
            fakeTestRatio: 0,
            trustScore: 90,
          },
        ),
      ),
    );
    const unflagged = createGateResult(
      policy,
      parseDecisionEnvelope(
        envelope([], {
          total: 0,
          assessed: 0,
          fake: 0,
          weak: 0,
          invalid: 0,
          unassessed: 0,
          fakeTestRatio: 0,
          trustScore: 100,
        }),
      ),
    );

    expect(weak).toMatchObject({
      status: 'passed',
      reasonCodes: ['NO_STATIC_FAKE_FINDINGS'],
      staticSummary: { fake: 0, weak: 1, invalid: 0 },
    });
    expect(unflagged).toMatchObject({
      status: 'passed',
      reasonCodes: ['NO_STATIC_FAKE_FINDINGS'],
    });
  });

  it('rejects a structurally valid snapshot containing INVALID findings', () => {
    expect(() =>
      createGateResult(
        policy,
        parseDecisionEnvelope(
          envelope(
            [
              {
                ruleId: 'PARSER001',
                severity: 'WARNING',
                classification: 'INVALID',
                confidence: 'HIGH',
                filePath: 'tests/broken.test.ts',
                line: 1,
                message: 'Source syntax is invalid.',
                remediation: 'Fix the syntax.',
              },
            ],
            {
              total: 1,
              assessed: 1,
              fake: 0,
              weak: 0,
              invalid: 1,
              unassessed: 0,
              fakeTestRatio: 0,
              trustScore: 90,
            },
          ),
        ),
      ),
    ).toThrow(GateError);
  });
});
