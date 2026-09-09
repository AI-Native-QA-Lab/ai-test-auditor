import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface DocumentPair {
  readonly english: string;
  readonly chinese: string;
  readonly englishTerms: readonly string[];
  readonly chineseTerms: readonly string[];
}

interface PublicDocument {
  readonly path: string;
  readonly terms: readonly string[];
}

const documentPairs: readonly DocumentPair[] = [
  {
    english: 'README.md',
    chinese: 'README_ZH.md',
    englishTerms: [
      '--mutation-report',
      '--changed-since',
      '--policy',
      'advisory',
      'source-only audit',
      'not a default CI gate',
      'release decision',
      'invalid policy input',
      'production-code-to-test relevance',
      'PARSER001',
      '`2`',
      'v1.0 is the current stable baseline',
      'not delivered',
      'Why AI Test Auditor?',
      'Quick start',
      'Common workflows',
      'Contributing',
      'CONTRIBUTING.md',
      'Core capabilities and limits',
      'Results and exit codes',
      'Project boundaries',
      'Documentation',
    ],
    chineseTerms: [
      '--mutation-report',
      '--changed-since',
      '--policy',
      'advisory',
      '纯源码审计',
      '不是默认 CI 门禁',
      '发布决定',
      '无效策略输入',
      '生产代码与测试',
      'PARSER001',
      '`2`',
      'v1.0 是当前稳定基线',
      '尚未交付',
      '为什么使用 AI Test Auditor？',
      '快速开始',
      '常用工作流',
      '参与贡献',
      'CONTRIBUTING_ZH.md',
      '核心能力与明确限制',
      '输出与退出码',
      '项目边界',
      '文档导航',
    ],
  },
  {
    english: 'docs/requirements.md',
    chinese: 'docs/zh/requirements.md',
    englishTerms: [
      'PARSER001',
      'semantic/mutation report',
      '--policy <path>',
      'version `1` advisory policy',
      'disabled/active selection counts only',
      'does not change static classifications, summary values, FTR, Trust Score, or exit semantics',
      'invalid policy',
    ],
    chineseTerms: [
      'PARSER001',
      'semantic/mutation report',
      '--policy <path>',
      'version `1` 的建议性策略',
      '禁用/活跃选择计数',
      '不改变静态分类、汇总值、FTR、Trust Score 或退出语义',
      '无效策略',
    ],
  },
  {
    english: 'docs/roadmap.md',
    chinese: 'docs/zh/roadmap.md',
    englishTerms: [
      'v1.0 is the current stable baseline',
      '2.0',
      'runtime, mutation, and LLM adapters',
      'source-only',
      'explicit opt-in',
      'not delivered',
    ],
    chineseTerms: [
      'v1.0 是当前稳定基线',
      '2.0',
      '运行时、变异和 LLM 适配器',
      '纯源码',
      '显式 opt-in',
      '尚未交付',
    ],
  },
  {
    english: 'docs/context.md',
    chinese: 'docs/zh/context.md',
    englishTerms: [
      'v1.0',
      'source-only',
      'Roadmap',
      'FAKE',
      'WEAK',
      'UNASSESSED',
      'Trust Score',
      'FTR',
      '2026-09-08-optional-ai-assist-design.md',
    ],
    chineseTerms: [
      'v1.0',
      '纯源码',
      '迭代计划',
      'FAKE',
      'WEAK',
      'UNASSESSED',
      'Trust Score',
      'FTR',
      '2026-09-08-optional-ai-assist-design.md',
    ],
  },
  {
    english: 'docs/architecture.md',
    chinese: 'docs/zh/architecture.md',
    englishTerms: [
      '--policy',
      'advisory policy',
      'source-only audit',
      'Invalid policy input exits `2`',
      'CI gate',
      'release decision',
    ],
    chineseTerms: [
      '--policy',
      '建议性策略',
      '纯源码审计',
      '无效策略输入返回退出码 `2`',
      'CI 门禁',
      '发布决定',
    ],
  },
  {
    english: 'docs/rules.md',
    chinese: 'docs/zh/rules.md',
    englishTerms: [
      '--policy',
      'advisory',
      'source-only audit',
      'Invalid policy input exits `2`',
      'CI gate',
      'release decision',
    ],
    chineseTerms: [
      '--policy',
      'advisory',
      '纯源码审计',
      '无效策略输入返回退出码 `2`',
      'CI 门禁',
      '发布决定',
    ],
  },
  {
    english: 'test-quality-audit/SKILL.md',
    chinese: 'test-quality-audit/SKILL_ZH.md',
    englishTerms: [
      'advisory policy',
      'source-only audit',
      'disabled/active selection counts',
      'CI gate',
      'release decision',
      'Do not execute test, model, or mutation commands.',
    ],
    chineseTerms: [
      'advisory 策略',
      '纯源码审计',
      '禁用/活跃选择计数',
      'CI 门禁',
      '发布决定',
      '不得执行测试、模型或 mutation 命令。',
    ],
  },
  {
    english: 'test-quality-audit/prompts/test-quality-audit.md',
    chinese: 'test-quality-audit/prompts/test-quality-audit-zh.md',
    englishTerms: [
      'advisory policy',
      'source-only audit',
      'disabled/active selection counts',
      'CI gate',
      'release decision',
    ],
    chineseTerms: [
      'advisory 策略',
      '纯源码审计',
      '禁用/活跃选择计数',
      'CI 门禁',
      '发布决定',
    ],
  },
];

const policyBoundaryDocuments: readonly PublicDocument[] = [
  {
    path: 'test-quality-audit/references/rule-boundary.md',
    terms: [
      'mode: "advisory"',
      'source-only audit',
      'disabled/active selection counts',
      'never executes test, model, or mutation commands',
      'CI gate',
      'release decision',
    ],
  },
  {
    path: 'test-quality-audit/evals/cases.md',
    terms: [
      '`advisory-policy`',
      'source-only findings/classifications',
      'selection counts only',
      'CI gate',
      'release decision',
    ],
  },
];

const decisionBoundaryDocuments: readonly PublicDocument[] = [
  { path: 'README.md', terms: ['ata decision', 'CI gate', 'valid decision'] },
  { path: 'README_ZH.md', terms: ['ata decision', 'CI 门禁', '有效决策'] },
  {
    path: 'docs/requirements.md',
    terms: ['ata decision', 'semantic', 'mutation'],
  },
  {
    path: 'docs/zh/requirements.md',
    terms: ['ata decision', 'semantic', 'mutation'],
  },
  { path: 'docs/architecture.md', terms: ['decision', 'advisory decision'] },
  { path: 'docs/zh/architecture.md', terms: ['decision', '建议性决策'] },
  { path: 'test-quality-audit/SKILL.md', terms: ['ata decision', 'CI gate'] },
  {
    path: 'test-quality-audit/SKILL_ZH.md',
    terms: ['ata decision', 'CI 门禁'],
  },
];

const githubReferenceDocuments: readonly PublicDocument[] = [
  {
    path: 'README.md',
    terms: [
      'GitHub Actions reference workflow',
      '`base-ref`',
      '`--changed-since`',
      '`contents: read`',
      'does not create PR comments',
    ],
  },
  {
    path: 'README_ZH.md',
    terms: [
      'GitHub Actions 参考工作流',
      '`base-ref`',
      '`--changed-since`',
      '`contents: read`',
      '不创建 PR 评论',
    ],
  },
  {
    path: 'docs/requirements.md',
    terms: ['GitHub Actions reference workflow', 'base-ref', 'advisory'],
  },
  {
    path: 'docs/zh/requirements.md',
    terms: ['GitHub Actions 参考工作流', 'base-ref', '建议性'],
  },
  {
    path: 'docs/architecture.md',
    terms: ['audit-reference.yml', 'DecisionEnvelope', 'changed-since'],
  },
  {
    path: 'docs/zh/architecture.md',
    terms: ['audit-reference.yml', 'DecisionEnvelope', 'changed-since'],
  },
  {
    path: 'docs/development.md',
    terms: ['audit-reference.yml', 'base-ref', 'Job Summary'],
  },
  {
    path: 'docs/zh/development.md',
    terms: ['audit-reference.yml', 'base-ref', 'Job Summary'],
  },
  {
    path: 'test-quality-audit/SKILL.md',
    terms: ['GitHub Actions reference workflow', 'PR comments', 'base-ref'],
  },
  {
    path: 'test-quality-audit/SKILL_ZH.md',
    terms: ['GitHub Actions 参考工作流', 'PR 评论', 'base-ref'],
  },
  {
    path: 'test-quality-audit/prompts/test-quality-audit.md',
    terms: ['GitHub Actions', 'advisory decision', 'PR comment'],
  },
  {
    path: 'test-quality-audit/prompts/test-quality-audit-zh.md',
    terms: ['GitHub Actions', '建议性决策', 'PR 评论'],
  },
  {
    path: 'test-quality-audit/references/rule-boundary.md',
    terms: ['GitHub Actions reference workflow', 'base-ref', 'PR comment'],
  },
  {
    path: 'test-quality-audit/evals/cases.md',
    terms: ['`github-reference-workflow`', 'PR comments', 'advisory decision'],
  },
];

const gateBoundaryDocuments: readonly PublicDocument[] = [
  {
    path: 'README.md',
    terms: [
      'explicit opt-in policy gate',
      'ata gate',
      'blockOn',
      'WEAK does not block',
    ],
  },
  {
    path: 'README_ZH.md',
    terms: ['显式 opt-in 策略门禁', 'ata gate', 'blockOn', 'WEAK 不阻断'],
  },
  {
    path: 'docs/requirements.md',
    terms: ['ata gate', 'FAKE-only', 'explicit opt-in'],
  },
  {
    path: 'docs/zh/requirements.md',
    terms: ['ata gate', '仅 FAKE', '显式 opt-in'],
  },
  {
    path: 'docs/architecture.md',
    terms: ['gate-policy', 'GateResult', 'FAKE-only gate'],
  },
  {
    path: 'docs/zh/architecture.md',
    terms: ['gate-policy', 'GateResult', '仅 FAKE 门禁'],
  },
  { path: 'docs/rules.md', terms: ['FAKE-only gate', 'WEAK never blocks'] },
  { path: 'docs/zh/rules.md', terms: ['仅 FAKE 门禁', 'WEAK 永不阻断'] },
  {
    path: 'test-quality-audit/SKILL.md',
    terms: ['ata gate', 'FAKE-only', 'WEAK never blocks'],
  },
  {
    path: 'test-quality-audit/SKILL_ZH.md',
    terms: ['ata gate', '仅 FAKE', 'WEAK 永不阻断'],
  },
  {
    path: 'test-quality-audit/prompts/test-quality-audit.md',
    terms: ['ata gate', 'FAKE-only gate'],
  },
  {
    path: 'test-quality-audit/prompts/test-quality-audit-zh.md',
    terms: ['ata gate', '仅 FAKE 门禁'],
  },
  {
    path: 'test-quality-audit/references/rule-boundary.md',
    terms: ['mode: "gate"', 'blockOn', 'FAKE-only gate'],
  },
  {
    path: 'test-quality-audit/evals/cases.md',
    terms: ['`fake-only-gate`', 'WEAK does not block'],
  },
];

const documentationArchitectureDocuments: readonly PublicDocument[] = [
  {
    path: 'docs/history/product-evolution.md',
    terms: ['产品演进', 'v1.0'],
  },
  {
    path: 'docs/history/architecture-decisions.md',
    terms: ['架构决策', 'v1.0'],
  },
  {
    path: 'docs/history/implementation-notes.md',
    terms: ['实施经验', 'v1.0', '材料决策', '验证命令', '已知限制'],
  },
  {
    path: 'AGENTS.md',
    terms: [
      'v1.0',
      'docs/roadmap.md',
      'docs/context.md',
      'FAKE',
      'WEAK',
      'UNASSESSED',
      'FTR',
      'Trust Score',
      'docs/history/implementation-notes.md',
    ],
  },
];

export async function validateBilingualPublicMarkers(): Promise<string[]> {
  const violations: string[] = [];
  const contents = new Map<string, string>();

  for (const pair of documentPairs) {
    const [english, chinese] = await Promise.all([
      readDocument(pair.english, contents),
      readDocument(pair.chinese, contents),
    ]);
    addMissingTerms(violations, pair.english, english, pair.englishTerms);
    addMissingTerms(violations, pair.chinese, chinese, pair.chineseTerms);
  }

  for (const document of policyBoundaryDocuments) {
    const content = await readDocument(document.path, contents);
    addMissingTerms(violations, document.path, content, document.terms);
  }
  for (const document of decisionBoundaryDocuments) {
    const content = await readDocument(document.path, contents);
    addMissingTerms(violations, document.path, content, document.terms);
  }
  for (const document of githubReferenceDocuments) {
    const content = await readDocument(document.path, contents);
    addMissingTerms(violations, document.path, content, document.terms);
  }
  for (const document of gateBoundaryDocuments) {
    const content = await readDocument(document.path, contents);
    addMissingTerms(violations, document.path, content, document.terms);
  }
  for (const document of documentationArchitectureDocuments) {
    const content = await readDocument(document.path, contents);
    addMissingTerms(violations, document.path, content, document.terms);
  }

  const [englishRules, chineseRules] = await Promise.all([
    readDocument('docs/rules.md', contents),
    readDocument('docs/zh/rules.md', contents),
  ]);
  if (!sameRuleEntries(englishRules, chineseRules)) {
    violations.push(
      'Rule IDs or classifications differ between docs/rules.md and docs/zh/rules.md.',
    );
  }

  const [englishReadme, chineseReadme] = await Promise.all([
    readDocument('README.md', contents),
    readDocument('README_ZH.md', contents),
  ]);
  if (!sameExitCodes(englishReadme, chineseReadme)) {
    violations.push(
      'Exit code rows differ between README.md and README_ZH.md.',
    );
  }
  if (!exitCodeMeaning(englishReadme, '2').includes('invalid policy')) {
    violations.push('README.md exit code 2 row must include invalid policy.');
  }
  if (!exitCodeMeaning(chineseReadme, '2').includes('无效策略输入')) {
    violations.push('README_ZH.md exit code 2 row must include 无效策略输入。');
  }

  const [englishRoadmap, chineseRoadmap] = await Promise.all([
    readDocument('docs/roadmap.md', contents),
    readDocument('docs/zh/roadmap.md', contents),
  ]);
  addRoadmapPhaseViolations(violations, 'docs/roadmap.md', englishRoadmap);
  addRoadmapPhaseViolations(violations, 'docs/zh/roadmap.md', chineseRoadmap);

  return violations;
}

async function readDocument(
  relativePath: string,
  contents: Map<string, string>,
): Promise<string> {
  const existing = contents.get(relativePath);
  if (existing !== undefined) return existing;
  const content = await readFile(resolve(projectRoot, relativePath), 'utf8');
  contents.set(relativePath, content);
  return content;
}

function addMissingTerms(
  violations: string[],
  path: string,
  content: string,
  requiredTerms: readonly string[],
): void {
  for (const term of requiredTerms) {
    if (!content.includes(term)) {
      violations.push(`${path} is missing required public marker: ${term}`);
    }
  }
}

function sameRuleEntries(english: string, chinese: string): boolean {
  return (
    JSON.stringify(ruleEntries(english)) ===
    JSON.stringify(ruleEntries(chinese))
  );
}

function ruleEntries(content: string): string[] {
  return [...content.matchAll(/^\| ([A-Z]+\d+) \| (\w+) /gm)].map(
    (match) => `${match[1] ?? ''}:${match[2] ?? ''}`,
  );
}

function sameExitCodes(english: string, chinese: string): boolean {
  return (
    JSON.stringify(exitCodes(english)) === JSON.stringify(exitCodes(chinese))
  );
}

function exitCodes(content: string): string[] {
  return [...content.matchAll(/^\| `(\d+)`\s*\|/gm)].map(
    (match) => match[1] ?? '',
  );
}

function exitCodeMeaning(content: string, code: string): string {
  const match = content.match(
    new RegExp(`^\\| \`${code}\`\\s*\\| (.+) \\|$`, 'm'),
  );
  return match?.[1] ?? '';
}

function addRoadmapPhaseViolations(
  violations: string[],
  path: string,
  content: string,
): void {
  const expected = ['v1.0', 'v2.0'];
  const positions = expected.map((phase) => content.indexOf(phase));
  if (
    positions.some((position) => position < 0) ||
    positions[0] >= positions[1]
  ) {
    violations.push(
      `${path} must list roadmap phases in order: ${expected.join(', ')}.`,
    );
  }
  if (content.includes('0.7–2.0')) {
    violations.push(
      `${path} must not retain the legacy 0.7–2.0 roadmap range.`,
    );
  }
}
