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
      '0.6.0',
      'source-only audit',
      'not a default CI gate',
      'release decision',
      'invalid policy input',
      'production-code-to-test relevance',
      'PARSER001',
      '`2`',
    ],
    chineseTerms: [
      '--mutation-report',
      '--changed-since',
      '--policy',
      'advisory',
      '0.6.0',
      '纯源码审计',
      '不是默认 CI 门禁',
      '发布决定',
      '无效策略输入',
      '生产代码与测试',
      'PARSER001',
      '`2`',
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
      'v0.4',
      '--mutation-report',
      '--policy',
      'advisory',
      '0.6.0',
      'source-only audit',
      'no default CI gate',
      'release decision',
      '0.7',
      '0.8',
      '0.9',
      '2.0',
      'source-only/advisory boundary',
      'runtime, mutation, and LLM adapters',
      'v0.7 through v0.9 remain source-only and advisory',
      'v1.0 remains source-only and is a stable explicit opt-in quality gate',
      'blocking only when a repository policy enables it',
    ],
    chineseTerms: [
      'v0.4',
      '--mutation-report',
      '--policy',
      'advisory',
      '0.6.0',
      '纯源码审计',
      '不存在默认 CI 门禁',
      '发布决定',
      '0.7',
      '0.8',
      '0.9',
      '2.0',
      '纯源码/建议性边界',
      '运行时、变异和 LLM 适配器',
      'v0.7 至 v0.9 保持纯源码且建议性',
      'v1.0 保持纯源码，并是稳定、显式 opt-in 的质量门禁',
      '仅当仓库策略启用时才阻断',
    ],
  },
  {
    english: 'docs/process/implementation-record.md',
    chinese: 'docs/process/implementation-record_zh.md',
    englishTerms: ['historical RED/GREEN evidence is not recorded'],
    chineseTerms: ['历史 RED/GREEN 证据未记录'],
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
      'v0.9.0 GitHub Actions reference workflow',
      '`base-ref`',
      '`--changed-since`',
      '`contents: read`',
      'does not create PR comments',
    ],
  },
  {
    path: 'README_ZH.md',
    terms: [
      'v0.9.0 GitHub Actions 参考工作流',
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
  if (!exitCodeMeaning(englishReadme, '2').includes('invalid policy input')) {
    violations.push(
      'README.md exit code 2 row must include invalid policy input.',
    );
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
  const expected = ['0.6.0', '0.7', '0.8', '0.9', '1.0', '2.0'];
  const actual = [
    ...content.matchAll(/^\| (0\.6\.0|0\.7|0\.8|0\.9|1\.0|2\.0)\s*\|/gm),
  ].map((match) => match[1] ?? '');
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
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
