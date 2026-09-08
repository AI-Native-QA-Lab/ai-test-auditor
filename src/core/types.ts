export type Classification =
  'INVALID' | 'FAKE' | 'WEAK' | 'STRONG' | 'UNASSESSED';

export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

export type TestType = 'unit' | 'api' | 'e2e' | 'unknown';

export type Framework = 'jest' | 'vitest' | 'playwright' | 'unknown';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TestCase {
  readonly filePath: string;
  readonly name: string;
  readonly framework: Framework;
  readonly type: TestType;
  readonly line: number;
  readonly source: string;
  readonly body: string;
}

export interface ParserDiagnostic {
  readonly filePath: string;
  readonly line: number;
  readonly message: string;
}

export interface ExtractionResult {
  readonly tests: readonly TestCase[];
  readonly diagnostics: readonly ParserDiagnostic[];
}

export interface Finding {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly classification: Classification;
  readonly confidence: Confidence;
  readonly filePath: string;
  readonly line: number;
  readonly message: string;
  readonly remediation: string;
}

export interface BaselineFindingIdentity {
  readonly ruleId: string;
  readonly filePath: string;
  readonly line: number;
  readonly classification: Classification;
  readonly severity: Severity;
}

export interface FindingBaseline {
  readonly version: '1';
  readonly id: string;
  readonly findings: readonly BaselineFindingIdentity[];
}

export interface BaselineComparison {
  readonly version: '1';
  readonly id: string;
  readonly historicalFindingCount: number;
  readonly newFindingCount: number;
}

export interface AuditPolicy {
  readonly version: '1';
  readonly id: string;
  readonly mode: 'advisory';
  readonly disabledRuleIds: readonly string[];
}

export interface PolicyEvaluation {
  readonly id: string;
  readonly version: '1';
  readonly mode: 'advisory';
  readonly disabledRuleIds: readonly string[];
  readonly disabledFindingCount: number;
  readonly activeFindingCount: number;
}

export interface AuditSummary {
  readonly total: number;
  readonly assessed: number;
  readonly fake: number;
  readonly weak: number;
  readonly invalid: number;
  readonly unassessed: number;
  readonly fakeTestRatio: number;
  readonly trustScore: number;
}

export interface AuditResult {
  readonly tests: readonly TestCase[];
  readonly findings: readonly Finding[];
  readonly diagnostics?: readonly ParserDiagnostic[];
  readonly semantic?: import('./semantic.js').SemanticReport;
  readonly mutation?: import('./mutation.js').MutationReport;
  readonly policy?: PolicyEvaluation;
  readonly baseline?: BaselineComparison;
  readonly summary: AuditSummary;
  readonly selection?: FileSelection;
}

export interface FileSelection {
  readonly mode: 'all' | 'changed-since';
  readonly requestedBaseRef?: string;
  readonly baseCommit?: string;
  readonly files: readonly string[];
}
