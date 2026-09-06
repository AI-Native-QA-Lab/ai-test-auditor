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

const documentPairs: readonly DocumentPair[] = [
  {
    english: 'README.md',
    chinese: 'README_ZH.md',
    englishTerms: ['--mutation-report', 'PARSER001', '`2`'],
    chineseTerms: ['--mutation-report', 'PARSER001', '`2`'],
  },
  {
    english: 'docs/requirements.md',
    chinese: 'docs/zh/requirements.md',
    englishTerms: ['PARSER001', 'semantic/mutation report'],
    chineseTerms: ['PARSER001', 'semantic/mutation report'],
  },
  {
    english: 'docs/roadmap.md',
    chinese: 'docs/zh/roadmap.md',
    englishTerms: ['v0.4', '--mutation-report'],
    chineseTerms: ['v0.4', '--mutation-report'],
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
