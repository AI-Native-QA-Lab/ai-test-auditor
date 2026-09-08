import { readFile } from 'node:fs/promises';
import type { AuditPolicy, Finding, PolicyEvaluation } from './types.js';

export type { AuditPolicy, PolicyEvaluation } from './types.js';

export class PolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyError';
  }
}

const supportedRuleIds = new Set([
  'UT001',
  'UT002',
  'UT003',
  'UT004',
  'UT008',
  'UT011',
  'API001',
  'API002',
  'E2E001',
  'E2E002',
  'E2E003',
  'E2E004',
  'PARSER001',
]);

export function parsePolicy(value: unknown): AuditPolicy {
  if (!value || typeof value !== 'object') {
    throw new PolicyError('Policy must be an object.');
  }

  const candidate = value as Record<string, unknown>;
  const disabledRuleIds = candidate.disabledRuleIds ?? [];
  if (
    candidate.version !== '1' ||
    !isNonEmptyString(candidate.id) ||
    candidate.mode !== 'advisory' ||
    !isValidDisabledRuleIds(disabledRuleIds)
  ) {
    throw new PolicyError(
      'Policy must contain version "1", a non-empty id, advisory mode, and unique non-empty disabled rule IDs.',
    );
  }

  return {
    version: '1',
    id: candidate.id,
    mode: 'advisory',
    disabledRuleIds: [...disabledRuleIds],
  };
}

export async function loadPolicy(path: string): Promise<AuditPolicy> {
  try {
    return parsePolicy(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (error instanceof PolicyError) throw error;
    throw new PolicyError(`Policy cannot be read: ${path}`);
  }
}

export function evaluatePolicy(
  policy: AuditPolicy,
  findings: readonly Finding[],
): PolicyEvaluation {
  const disabledRuleIds = new Set(policy.disabledRuleIds);
  const disabledFindingCount = findings.filter((finding) =>
    disabledRuleIds.has(finding.ruleId),
  ).length;

  return {
    id: policy.id,
    version: policy.version,
    mode: policy.mode,
    disabledRuleIds: [...policy.disabledRuleIds],
    disabledFindingCount,
    activeFindingCount: findings.length - disabledFindingCount,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isValidDisabledRuleIds(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.every(isNonEmptyString) &&
    value.every((ruleId) => supportedRuleIds.has(ruleId)) &&
    new Set(value).size === value.length
  );
}
