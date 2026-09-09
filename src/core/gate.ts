import type { DecisionEnvelope, GatePolicy, GateResult } from './types.js';

export type { GateResult } from './types.js';

export class GateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GateError';
  }
}

export function createGateResult(
  policy: GatePolicy,
  envelope: DecisionEnvelope,
): GateResult {
  const { summary } = envelope.audit;
  if (summary.invalid > 0) {
    throw new GateError('Static audit snapshot contains INVALID findings.');
  }

  return {
    version: '1',
    mode: 'gate',
    status: summary.fake > 0 ? 'blocked' : 'passed',
    reasonCodes:
      summary.fake > 0 ? ['STATIC_FAKE_FINDINGS'] : ['NO_STATIC_FAKE_FINDINGS'],
    staticSummary: {
      fake: summary.fake,
      weak: summary.weak,
      invalid: summary.invalid,
    },
    policyId: policy.id,
  };
}
