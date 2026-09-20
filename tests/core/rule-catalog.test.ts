import { describe, expect, it } from 'vitest';
import { parsePolicy } from '../../src/core/policy';
import { RULE_CATALOG, supportedRuleIds } from '../../src/rules/catalog';

const v12RuleIds = [
  'UT012',
  'UT013',
  'UT014',
  'UT015',
  'API003',
  'API004',
  'API005',
  'API006',
  'API007',
  'API008',
  'API009',
  'API010',
  'E2E005',
  'E2E006',
  'E2E007',
  'E2E008',
  'E2E009',
  'E2E010',
];

describe('v1.2 rule catalog contract', () => {
  it('lists ten Unit, ten API, ten E2E, and one Parser rule', () => {
    const counts = RULE_CATALOG.reduce<Record<string, number>>(
      (result, definition) => ({
        ...result,
        [definition.type]: (result[definition.type] ?? 0) + 1,
      }),
      {},
    );

    expect(counts).toEqual({ unit: 10, api: 10, e2e: 10, parser: 1 });
    expect(new Set(supportedRuleIds()).size).toBe(31);
  });

  it('accepts every planned v1.2 rule ID in an advisory policy', () => {
    expect(() =>
      parsePolicy({
        version: '1',
        id: 'v1.2-all-rules',
        mode: 'advisory',
        disabledRuleIds: v12RuleIds,
      }),
    ).not.toThrow();
  });
});
