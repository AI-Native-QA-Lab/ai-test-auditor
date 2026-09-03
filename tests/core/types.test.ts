import { describe, expect, it } from 'vitest';
import type {
  AuditResult,
  Classification,
  Confidence,
  Finding,
  Framework,
  Severity,
  TestCase,
  TestType,
} from '../../src/core/types';

describe('core type contracts', () => {
  it('supports the documented audit result shape without runtime type imports', () => {
    const classification: Classification = 'UNASSESSED';
    const severity: Severity = 'INFO';
    const confidence: Confidence = 'LOW';
    const testType: TestType = 'unknown';
    const framework: Framework = 'unknown';
    const testCase: TestCase = {
      filePath: 'tests/example.test.ts',
      name: 'example test',
      framework,
      type: testType,
      line: 1,
      source: 'it("example", () => {});',
      body: 'it("example", () => {});',
    };
    const finding: Finding = {
      ruleId: 'UT001',
      severity,
      classification,
      confidence,
      filePath: testCase.filePath,
      line: testCase.line,
      message: 'No assertion was found.',
      remediation: 'Add a behavior-focused assertion.',
    };
    const result: AuditResult = {
      tests: [testCase],
      findings: [finding],
      summary: {
        total: 1,
        assessed: 0,
        fake: 0,
        weak: 0,
        invalid: 0,
        unassessed: 1,
        fakeTestRatio: 0,
        trustScore: 100,
      },
    };

    expect(result.summary.total).toBe(result.tests.length);
    expect(result.findings[0]?.ruleId).toBe('UT001');
  });
});
