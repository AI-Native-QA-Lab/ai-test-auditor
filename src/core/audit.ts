import { readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { extractTestsWithDiagnostics } from './extractor.js';
import { resolveSemanticProvider } from './semantic.js';
import { evaluateRules } from './rule-engine.js';
import { scanFiles } from './scanner.js';
import type {
  AuditResult,
  AuditSummary,
  Classification,
  Finding,
  TestCase,
  TestType,
} from './types.js';

export type ReviewType = Exclude<TestType, 'unknown'> | 'auto';
export interface AuditOptions {
  readonly type?: ReviewType;
  readonly configPath?: string;
}

const supportedTestFile = /(?:\.(?:test|spec)\.(?:ts|tsx|js)|\.e2e\.ts)$/;

export class InputPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputPathError';
  }
}

export function auditTestCases(tests: readonly TestCase[]): AuditResult {
  const findingsByTest = tests.map((testCase) => evaluateRules(testCase));
  const findings = findingsByTest.flat();
  const classifications = findingsByTest.map(classifyTest);

  return {
    tests: [...tests],
    findings,
    summary: summarize(classifications, findings),
  };
}

export async function auditPath(
  inputPath: string,
  options: AuditOptions | ReviewType = 'auto',
): Promise<AuditResult> {
  const reviewType =
    typeof options === 'string' ? options : (options.type ?? 'auto');
  const absolutePath = resolve(inputPath);
  let inputStats;

  try {
    inputStats = await stat(absolutePath);
  } catch {
    throw new InputPathError(`Input path does not exist: ${absolutePath}`);
  }

  let files: string[];
  if (inputStats.isDirectory()) {
    try {
      files = await scanFiles(absolutePath);
    } catch {
      throw new InputPathError(`Input path cannot be read: ${absolutePath}`);
    }
  } else if (inputStats.isFile() && supportedTestFile.test(absolutePath)) {
    files = [absolutePath];
  } else if (inputStats.isFile()) {
    throw new InputPathError(
      `Input file is not a supported test file: ${absolutePath}`,
    );
  } else {
    throw new InputPathError(
      `Input path must be a file or directory: ${absolutePath}`,
    );
  }

  const config =
    typeof options === 'string'
      ? { include: [], exclude: [] }
      : await readConfig(options.configPath);
  const selectedFiles = files.filter((filePath) => {
    const name = basename(filePath);
    return (
      (config.include.length === 0 || config.include.includes(name)) &&
      !config.exclude.includes(name)
    );
  });
  const outcomes = selectedFiles.map((filePath) =>
    extractTestsWithDiagnostics(filePath),
  );
  const tests = outcomes
    .flatMap((outcome) => outcome.tests)
    .map((testCase) => applyReviewType(testCase, reviewType));

  const result = auditTestCases(tests);
  const diagnostics = outcomes.flatMap((outcome) => outcome.diagnostics);
  return diagnostics.length === 0 ? result : { ...result, diagnostics };
}

async function readConfig(configPath?: string): Promise<{
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}> {
  if (!configPath) return { include: [], exclude: [] };
  try {
    const raw: unknown = JSON.parse(
      await readFile(resolve(configPath), 'utf8'),
    );
    if (!raw || typeof raw !== 'object') throw new Error();
    const candidate = raw as {
      include?: unknown;
      exclude?: unknown;
      semanticProvider?: unknown;
    };
    const include = candidate.include ?? [];
    const exclude = candidate.exclude ?? [];
    if (
      !Array.isArray(include) ||
      !Array.isArray(exclude) ||
      !include.every((value) => typeof value === 'string') ||
      !exclude.every((value) => typeof value === 'string')
    )
      throw new Error();
    resolveSemanticProvider(candidate.semanticProvider);
    return { include, exclude };
  } catch {
    throw new InputPathError(`Config file is invalid: ${resolve(configPath)}`);
  }
}

function applyReviewType(testCase: TestCase, reviewType: ReviewType): TestCase {
  if (reviewType === 'auto') return testCase;
  return { ...testCase, type: reviewType };
}

function classifyTest(findings: readonly Finding[]): Classification {
  if (findings.some((finding) => finding.classification === 'INVALID')) {
    return 'INVALID';
  }
  if (findings.some((finding) => finding.classification === 'FAKE')) {
    return 'FAKE';
  }
  if (findings.some((finding) => finding.classification === 'WEAK')) {
    return 'WEAK';
  }
  return 'UNASSESSED';
}

function summarize(
  classifications: readonly Classification[],
  findings: readonly Finding[],
): AuditSummary {
  const fake = count(classifications, 'FAKE');
  const weak = count(classifications, 'WEAK');
  const invalid = count(classifications, 'INVALID');
  const unassessed = count(classifications, 'UNASSESSED');
  const assessed = fake + weak + invalid;
  const critical = findings.filter(
    (finding) => finding.severity === 'CRITICAL',
  ).length;
  const warning = findings.filter(
    (finding) => finding.severity === 'WARNING',
  ).length;

  return {
    total: classifications.length,
    assessed,
    fake,
    weak,
    invalid,
    unassessed,
    fakeTestRatio:
      assessed === 0 ? 0 : Number(((fake / assessed) * 100).toFixed(2)),
    trustScore: Math.max(0, 100 - critical * 25 - warning * 10),
  };
}

function count(
  classifications: readonly Classification[],
  classification: Classification,
): number {
  return classifications.filter((candidate) => candidate === classification)
    .length;
}
