import type { Finding, TestCase } from './types.js';
import { evaluateApiRules } from '../rules/api.js';
import { evaluateE2eRules } from '../rules/e2e.js';
import { evaluateUnitRules } from '../rules/unit.js';

export interface Rule {
  readonly id: string;
  evaluate(testCase: TestCase): readonly Finding[];
}

const rules: readonly Rule[] = [
  { id: 'UT', evaluate: evaluateUnitRules },
  { id: 'API', evaluate: evaluateApiRules },
  { id: 'E2E', evaluate: evaluateE2eRules },
];

export function evaluateRules(testCase: TestCase): Finding[] {
  return rules.flatMap((rule) => rule.evaluate(testCase));
}
