import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extractTests } from './extractor.js';
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
  reviewType: ReviewType = 'auto',
): Promise<AuditResult> {
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

  const tests = files
    .flatMap((filePath) => extractTests(filePath))
    .map((testCase) => applyReviewType(testCase, reviewType));

  return auditTestCases(tests);
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
