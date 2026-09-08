import { readFile } from 'node:fs/promises';
import { isAbsolute, relative } from 'node:path';
import type {
  BaselineComparison,
  BaselineFindingIdentity,
  Classification,
  Finding,
  FindingBaseline,
  Severity,
} from './types.js';

export type {
  BaselineComparison,
  BaselineFindingIdentity,
  FindingBaseline,
} from './types.js';

export class BaselineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaselineError';
  }
}

const classifications: readonly Classification[] = [
  'INVALID',
  'FAKE',
  'WEAK',
  'STRONG',
  'UNASSESSED',
];
const severities: readonly Severity[] = ['CRITICAL', 'WARNING', 'INFO'];

export function parseBaseline(value: unknown): FindingBaseline {
  if (!value || typeof value !== 'object')
    throw new BaselineError('Baseline must be an object.');
  const candidate = value as Record<string, unknown>;
  if (
    candidate.version !== '1' ||
    !nonEmpty(candidate.id) ||
    !Array.isArray(candidate.findings)
  ) {
    throw new BaselineError(
      'Baseline must contain version "1", a non-empty id, and findings.',
    );
  }
  const findings = candidate.findings.map(parseIdentity);
  if (new Set(findings.map(identityKey)).size !== findings.length) {
    throw new BaselineError('Baseline findings must have unique identities.');
  }
  return { version: '1', id: candidate.id, findings };
}

export async function loadBaseline(path: string): Promise<FindingBaseline> {
  try {
    return parseBaseline(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (error instanceof BaselineError) throw error;
    throw new BaselineError(`Baseline cannot be read: ${path}`);
  }
}

export function compareBaseline(
  baseline: FindingBaseline,
  findings: readonly Finding[],
  inputRoot: string,
): BaselineComparison {
  const identities = new Set(baseline.findings.map(identityKey));
  const historicalFindingCount = findings.filter((finding) =>
    identities.has(identityKey(currentIdentity(finding, inputRoot))),
  ).length;
  return {
    version: '1',
    id: baseline.id,
    historicalFindingCount,
    newFindingCount: findings.length - historicalFindingCount,
  };
}

function parseIdentity(value: unknown): BaselineFindingIdentity {
  if (!value || typeof value !== 'object')
    throw new BaselineError('Baseline finding must be an object.');
  const item = value as Record<string, unknown>;
  if (
    !nonEmpty(item.ruleId) ||
    !safeRelativePath(item.filePath) ||
    !positiveInteger(item.line) ||
    !classifications.includes(item.classification as Classification) ||
    !severities.includes(item.severity as Severity)
  ) {
    throw new BaselineError('Baseline finding has an invalid identity.');
  }
  return {
    ruleId: item.ruleId,
    filePath: item.filePath.replaceAll('\\', '/'),
    line: item.line,
    classification: item.classification as Classification,
    severity: item.severity as Severity,
  };
}

function currentIdentity(
  finding: Finding,
  inputRoot: string,
): BaselineFindingIdentity {
  const filePath = relative(inputRoot, finding.filePath).replaceAll('\\', '/');
  if (!safeRelativePath(filePath))
    throw new BaselineError(
      `Finding path is outside input root: ${finding.filePath}`,
    );
  return {
    ruleId: finding.ruleId,
    filePath,
    line: finding.line,
    classification: finding.classification,
    severity: finding.severity,
  };
}

function identityKey(identity: BaselineFindingIdentity): string {
  return [
    identity.ruleId,
    identity.filePath,
    identity.line,
    identity.classification,
    identity.severity,
  ].join('\u0000');
}
function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
function safeRelativePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value !== '' &&
    !value.includes('\\') &&
    !isAbsolute(value) &&
    !value.split(/[\\/]/).includes('..')
  );
}
