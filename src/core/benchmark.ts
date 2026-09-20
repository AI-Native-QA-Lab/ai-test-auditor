import { readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { auditPath } from './audit.js';
import type { Classification } from './types.js';
import { supportedRuleIds } from '../rules/catalog.js';

export type BenchmarkType = 'unit' | 'api' | 'e2e';

export interface BenchmarkFindingIdentity {
  readonly ruleId: string;
  readonly classification: Classification;
}

export interface BenchmarkCase {
  readonly id: string;
  readonly sourcePath: string;
  readonly type: BenchmarkType;
  readonly expectedFindings: readonly BenchmarkFindingIdentity[];
  readonly nonTriggers: readonly string[];
}

export interface BenchmarkManifest {
  readonly version: '1';
  readonly cases: readonly BenchmarkCase[];
}

export interface BenchmarkCaseResult {
  readonly id: string;
  readonly sourcePath: string;
  readonly status: 'passed' | 'failed';
  readonly expectedFindings: readonly BenchmarkFindingIdentity[];
  readonly actualFindings: readonly BenchmarkFindingIdentity[];
  readonly missingFindings: readonly BenchmarkFindingIdentity[];
  readonly unexpectedFindings: readonly BenchmarkFindingIdentity[];
  readonly nonTriggerViolations: readonly string[];
}

export interface BenchmarkRun {
  readonly version: '1';
  readonly status: 'passed' | 'failed';
  readonly manifestPath: string;
  readonly counts: {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
  };
  readonly cases: readonly BenchmarkCaseResult[];
}

export class BenchmarkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BenchmarkError';
  }
}

const benchmarkTypes = new Set<BenchmarkType>(['unit', 'api', 'e2e']);
const classifications = new Set<Classification>([
  'INVALID',
  'FAKE',
  'WEAK',
  'STRONG',
  'UNASSESSED',
]);
const supportedRuleIdSet = new Set(supportedRuleIds());

export function parseBenchmarkManifest(value: unknown): BenchmarkManifest {
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'cases'])) {
    throw new BenchmarkError(
      'Benchmark manifest must contain only version and cases fields.',
    );
  }
  if (value.version !== '1' || !Array.isArray(value.cases)) {
    throw new BenchmarkError(
      'Benchmark manifest must use version "1" and an array of cases.',
    );
  }
  if (value.cases.length === 0) {
    throw new BenchmarkError(
      'Benchmark manifest must contain at least one case.',
    );
  }

  const seenCaseIds = new Set<string>();
  const cases = value.cases.map((candidate, index) => {
    const parsed = parseBenchmarkCase(candidate, index);
    if (seenCaseIds.has(parsed.id)) {
      throw new BenchmarkError('Benchmark case ID is duplicated: ' + parsed.id);
    }
    seenCaseIds.add(parsed.id);
    return parsed;
  });

  return { version: '1', cases };
}

export async function loadBenchmarkManifest(
  manifestPath: string,
): Promise<BenchmarkManifest> {
  const absoluteManifestPath = resolve(manifestPath);
  let value: unknown;
  try {
    value = JSON.parse(await readFile(absoluteManifestPath, 'utf8'));
  } catch {
    throw new BenchmarkError(
      'Benchmark manifest cannot be read: ' + absoluteManifestPath,
    );
  }

  const manifest = parseBenchmarkManifest(value);
  const manifestDirectory = dirname(absoluteManifestPath);
  for (const benchmarkCase of manifest.cases) {
    const sourcePath = resolve(manifestDirectory, benchmarkCase.sourcePath);
    const relativeSource = relative(manifestDirectory, sourcePath);
    if (
      relativeSource === '' ||
      relativeSource === '..' ||
      relativeSource.startsWith('..' + pathSeparator()) ||
      isAbsolute(relativeSource)
    ) {
      throw new BenchmarkError(
        'Benchmark source path must stay relative to the manifest: ' +
          benchmarkCase.sourcePath,
      );
    }
    try {
      if (!(await stat(sourcePath)).isFile()) throw new Error();
    } catch {
      throw new BenchmarkError(
        'Benchmark source path does not exist: ' + benchmarkCase.sourcePath,
      );
    }
  }
  return manifest;
}

export async function runBenchmark(
  manifestPath: string,
): Promise<BenchmarkRun> {
  const absoluteManifestPath = resolve(manifestPath);
  const manifest = await loadBenchmarkManifest(absoluteManifestPath);
  const manifestDirectory = dirname(absoluteManifestPath);
  const cases: BenchmarkCaseResult[] = [];

  for (const benchmarkCase of manifest.cases) {
    const sourcePath = resolve(manifestDirectory, benchmarkCase.sourcePath);
    let result;
    try {
      result = await auditPath(sourcePath, { type: benchmarkCase.type });
    } catch (error) {
      if (error instanceof Error) {
        throw new BenchmarkError(
          'Benchmark case ' +
            benchmarkCase.id +
            ' could not be audited: ' +
            error.message,
        );
      }
      throw new BenchmarkError(
        'Benchmark case ' + benchmarkCase.id + ' could not be audited.',
      );
    }

    const expectedFindings = sortIdentities(benchmarkCase.expectedFindings);
    const actualFindings = sortIdentities(
      result.findings.map(({ ruleId, classification }) => ({
        ruleId,
        classification,
      })),
    );
    const { missingFindings, unexpectedFindings } = compareIdentities(
      expectedFindings,
      actualFindings,
    );
    const nonTriggerViolations = actualFindings
      .filter((finding) => benchmarkCase.nonTriggers.includes(finding.ruleId))
      .map((finding) => finding.ruleId);
    const failed =
      missingFindings.length > 0 ||
      unexpectedFindings.length > 0 ||
      nonTriggerViolations.length > 0;

    cases.push({
      id: benchmarkCase.id,
      sourcePath: benchmarkCase.sourcePath,
      status: failed ? 'failed' : 'passed',
      expectedFindings,
      actualFindings,
      missingFindings,
      unexpectedFindings,
      nonTriggerViolations: [...new Set(nonTriggerViolations)].sort(),
    });
  }

  const passed = cases.filter(
    (benchmarkCase) => benchmarkCase.status === 'passed',
  ).length;
  const failed = cases.length - passed;
  return {
    version: '1',
    status: failed === 0 ? 'passed' : 'failed',
    manifestPath: absoluteManifestPath,
    counts: { total: cases.length, passed, failed },
    cases,
  };
}

export function renderBenchmarkText(run: BenchmarkRun): string {
  const lines = [
    'Benchmark v' +
      run.version +
      ': ' +
      run.status +
      ' (' +
      run.counts.passed +
      '/' +
      run.counts.total +
      ' cases passed)',
  ];
  for (const benchmarkCase of run.cases) {
    lines.push(
      '- ' + benchmarkCase.status.toUpperCase() + ': ' + benchmarkCase.id,
    );
    if (benchmarkCase.missingFindings.length > 0) {
      lines.push(
        '  missing: ' + formatIdentities(benchmarkCase.missingFindings),
      );
    }
    if (benchmarkCase.unexpectedFindings.length > 0) {
      lines.push(
        '  unexpected: ' + formatIdentities(benchmarkCase.unexpectedFindings),
      );
    }
    if (benchmarkCase.nonTriggerViolations.length > 0) {
      lines.push(
        '  non-triggers violated: ' +
          benchmarkCase.nonTriggerViolations.join(', '),
      );
    }
  }
  return lines.join('\n') + '\n';
}

function parseBenchmarkCase(value: unknown, index: number): BenchmarkCase {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'id',
      'sourcePath',
      'type',
      'expectedFindings',
      'nonTriggers',
    ])
  ) {
    throw new BenchmarkError(
      'Benchmark case ' + (index + 1) + ' has unexpected or missing fields.',
    );
  }
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.sourcePath) ||
    isAbsolute(value.sourcePath) ||
    !benchmarkTypes.has(value.type as BenchmarkType) ||
    !Array.isArray(value.expectedFindings) ||
    !Array.isArray(value.nonTriggers)
  ) {
    throw new BenchmarkError(
      'Benchmark case ' +
        (index + 1) +
        ' has invalid id, sourcePath, type, or arrays.',
    );
  }

  const expectedFindings = value.expectedFindings.map((finding, findingIndex) =>
    parseFindingIdentity(
      finding,
      'case ' + value.id + ' expectation ' + (findingIndex + 1),
    ),
  );
  const expectedRuleIds = expectedFindings.map((finding) => finding.ruleId);
  if (new Set(expectedRuleIds).size !== expectedRuleIds.length) {
    throw new BenchmarkError(
      'Benchmark case ' + value.id + ' contains duplicate expected rule IDs.',
    );
  }

  if (
    !value.nonTriggers.every((ruleId): ruleId is string =>
      isNonEmptyString(ruleId),
    )
  ) {
    throw new BenchmarkError(
      'Benchmark case ' + value.id + ' has invalid non-trigger rule IDs.',
    );
  }
  const nonTriggers = [...value.nonTriggers];
  if (new Set(nonTriggers).size !== nonTriggers.length) {
    throw new BenchmarkError(
      'Benchmark case ' +
        value.id +
        ' contains duplicate non-trigger rule IDs.',
    );
  }
  for (const ruleId of nonTriggers) {
    if (!supportedRuleIdSet.has(ruleId)) {
      throw new BenchmarkError(
        'Benchmark case ' +
          value.id +
          ' references unknown non-trigger rule ID: ' +
          ruleId,
      );
    }
  }
  const overlap = expectedRuleIds.find((ruleId) =>
    nonTriggers.includes(ruleId),
  );
  if (overlap) {
    throw new BenchmarkError(
      'Benchmark case ' +
        value.id +
        ' expects and forbids the same rule ID: ' +
        overlap,
    );
  }

  return {
    id: value.id,
    sourcePath: value.sourcePath,
    type: value.type as BenchmarkType,
    expectedFindings,
    nonTriggers,
  };
}

function parseFindingIdentity(
  value: unknown,
  label: string,
): BenchmarkFindingIdentity {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['ruleId', 'classification']) ||
    !isNonEmptyString(value.ruleId) ||
    !supportedRuleIdSet.has(value.ruleId) ||
    !classifications.has(value.classification as Classification)
  ) {
    throw new BenchmarkError(
      'Benchmark ' + label + ' has an unknown rule ID or classification.',
    );
  }
  return {
    ruleId: value.ruleId,
    classification: value.classification as Classification,
  };
}

function compareIdentities(
  expected: readonly BenchmarkFindingIdentity[],
  actual: readonly BenchmarkFindingIdentity[],
): {
  readonly missingFindings: readonly BenchmarkFindingIdentity[];
  readonly unexpectedFindings: readonly BenchmarkFindingIdentity[];
} {
  const remainingExpected = [...expected];
  const unexpectedFindings: BenchmarkFindingIdentity[] = [];
  for (const finding of actual) {
    const index = remainingExpected.findIndex((candidate) =>
      sameIdentity(candidate, finding),
    );
    if (index === -1) unexpectedFindings.push(finding);
    else remainingExpected.splice(index, 1);
  }
  return {
    missingFindings: remainingExpected,
    unexpectedFindings,
  };
}

function sortIdentities(
  findings: readonly BenchmarkFindingIdentity[],
): BenchmarkFindingIdentity[] {
  return [...findings].sort((left, right) =>
    (left.ruleId + ':' + left.classification).localeCompare(
      right.ruleId + ':' + right.classification,
    ),
  );
}

function sameIdentity(
  left: BenchmarkFindingIdentity,
  right: BenchmarkFindingIdentity,
): boolean {
  return (
    left.ruleId === right.ruleId && left.classification === right.classification
  );
}

function formatIdentities(
  findings: readonly BenchmarkFindingIdentity[],
): string {
  return findings
    .map((finding) => finding.ruleId + '/' + finding.classification)
    .join(', ');
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function pathSeparator(): string {
  return process.platform === 'win32' ? '\\' : '/';
}
