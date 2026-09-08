import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../src/cli';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(source: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ata-cli-'));
  temporaryRoots.push(root);
  await writeFile(join(root, 'example.test.ts'), source);
  return root;
}

async function config(root: string, source: string): Promise<string> {
  const path = join(root, 'ata.config.json');
  await writeFile(path, source);
  return path;
}

async function invoke(args: string[]): Promise<{
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}> {
  let stdout = '';
  let stderr = '';
  const code = await runCli(args, {
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

describe('ata review', () => {
  it('emits an advisory decision with exit code 0 for a valid static snapshot', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );
    const envelopePath = join(root, 'decision.json');
    await writeFile(
      envelopePath,
      JSON.stringify({
        version: '1',
        audit: {
          tests: [
            {
              filePath: 'example.test.ts',
              name: 'fake',
              framework: 'vitest',
              type: 'unit',
              line: 1,
              source: '() => { expect(true).toBe(true); }',
              body: '{ expect(true).toBe(true); }',
            },
          ],
          findings: [
            {
              ruleId: 'UT002',
              severity: 'CRITICAL',
              classification: 'FAKE',
              confidence: 'HIGH',
              filePath: 'example.test.ts',
              line: 1,
              message: 'The same literal appears on both sides.',
              remediation: 'Use an independent expected value.',
            },
          ],
          summary: {
            total: 1,
            assessed: 1,
            fake: 1,
            weak: 0,
            invalid: 0,
            unassessed: 0,
            fakeTestRatio: 100,
            trustScore: 75,
          },
        },
      }),
    );

    const invocation = await invoke(['decision', envelopePath]);

    expect(invocation.code).toBe(0);
    expect(invocation.stderr).toBe('');
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      version: '1',
      mode: 'advisory',
      recommendation: 'attention',
      reasonCodes: ['STATIC_FAKE_FINDINGS'],
    });
  });

  it('returns 2 without partial output for an invalid decision envelope', async () => {
    const root = await fixture('');
    const envelopePath = join(root, 'decision.json');
    await writeFile(envelopePath, '{}');

    const invocation = await invoke(['decision', envelopePath]);

    expect(invocation.code).toBe(2);
    expect(invocation.stdout).toBe('');
    expect(invocation.stderr).toMatch(/^Error: Decision/);
  });

  it('reports the current package release version', async () => {
    const invocation = await invoke(['--version']);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).toContain('0.8.0');
  });

  it('keeps a matching baseline FAKE exit code and returns baseline JSON', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );
    const baselinePath = join(root, 'baseline.json');
    await writeFile(
      baselinePath,
      JSON.stringify({
        version: '1',
        id: 'main',
        findings: [
          {
            ruleId: 'UT002',
            filePath: 'example.test.ts',
            line: 1,
            classification: 'FAKE',
            severity: 'CRITICAL',
          },
        ],
      }),
    );
    const invocation = await invoke([
      'review',
      root,
      '--baseline',
      baselinePath,
      '--format',
      'json',
    ]);
    expect(invocation.code).toBe(1);
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      baseline: { id: 'main', historicalFindingCount: 1, newFindingCount: 0 },
    });
  });

  it('returns 1 and JSON when a deterministic FAKE finding exists', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );

    const invocation = await invoke(['review', root, '--format', 'json']);

    expect(invocation.code).toBe(1);
    expect(invocation.stderr).toBe('');
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      summary: { total: 1, fake: 1, fakeTestRatio: 100, trustScore: 75 },
      findings: [{ ruleId: 'UT002', classification: 'FAKE' }],
    });
  });

  it('returns 0 without claiming that an unflagged test is strong', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('unassessed', () => { expect(result).toBe('ready'); });",
    );

    const invocation = await invoke(['review', root]);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).toContain('UNASSESSED');
    expect(invocation.stdout).toContain('not evidence that they are STRONG');
  });

  it('applies an explicit API type without executing the fixture', async () => {
    const marker = join(tmpdir(), `ata-executed-${Date.now()}`);
    const root = await fixture(
      `import { writeFileSync } from 'node:fs'; import { expect, test } from 'vitest'; writeFileSync(${JSON.stringify(marker)}, 'executed'); test('status only', () => { expect(response.status).toBe(200); });`,
    );

    const invocation = await invoke(['review', root, '--type', 'api']);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).toContain('API001');
    await expect(
      import('node:fs/promises').then(({ access }) => access(marker)),
    ).rejects.toThrow();
  });

  it.each([
    [['review', '--type', 'integration'], 'type'],
    [['review', '--format', 'xml'], 'format'],
  ])('returns 2 for an invalid %s option', async (args, expected) => {
    const invocation = await invoke(args);

    expect(invocation.code).toBe(2);
    expect(invocation.stderr.toLowerCase()).toContain(expected);
  });

  it('returns 2 for a missing input path', async () => {
    const invocation = await invoke([
      'review',
      join(tmpdir(), `ata-missing-${Date.now()}`),
    ]);

    expect(invocation.code).toBe(2);
    expect(invocation.stderr).toContain('Input path');
  });

  it('returns 2 with a PARSER001 finding for invalid test source', async () => {
    const root = await fixture('const = ;');

    const invocation = await invoke(['review', root, '--format', 'json']);

    expect(invocation.code).toBe(2);
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      summary: { invalid: 1 },
      findings: [{ ruleId: 'PARSER001', classification: 'INVALID' }],
    });
  });

  it('preserves INVALID exit precedence when policy accompanies PARSER001 and UT002', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );
    await writeFile(join(root, 'broken.test.ts'), 'const = ;');
    const policyPath = join(root, 'policy.json');
    await writeFile(
      policyPath,
      '{"version":"1","id":"local-policy","mode":"advisory","disabledRuleIds":["UT002"]}',
    );

    const invocation = await invoke([
      'review',
      root,
      '--policy',
      policyPath,
      '--format',
      'json',
    ]);

    expect(invocation.code).toBe(2);
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      findings: [
        { ruleId: 'UT002', classification: 'FAKE' },
        { ruleId: 'PARSER001', classification: 'INVALID' },
      ],
      summary: { fake: 1, invalid: 1 },
      policy: {
        id: 'local-policy',
        disabledFindingCount: 1,
        activeFindingCount: 1,
      },
    });
  });

  it('attaches advisory policy while preserving a disabled static FAKE exit code', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );
    const policyPath = join(root, 'policy.json');
    await writeFile(
      policyPath,
      '{"version":"1","id":"local-policy","mode":"advisory","disabledRuleIds":["UT002"]}',
    );

    const invocation = await invoke([
      'review',
      root,
      '--policy',
      policyPath,
      '--format',
      'json',
    ]);

    expect(invocation.code).toBe(1);
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      findings: [{ ruleId: 'UT002', classification: 'FAKE' }],
      summary: { fake: 1 },
      policy: {
        id: 'local-policy',
        disabledFindingCount: 1,
        activeFindingCount: 0,
      },
    });
  });

  it('returns 2 and a Policy error for an invalid policy', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('ok', () => { expect(value).toBe('ok'); });",
    );
    const policyPath = join(root, 'policy.json');
    await writeFile(policyPath, '{}');

    const invocation = await invoke(['review', root, '--policy', policyPath]);

    expect(invocation.code).toBe(2);
    expect(invocation.stderr).toMatch(/^Error: Policy/);
  });

  it('documents all exit codes in review help', async () => {
    const invocation = await invoke(['review', '--help']);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).toContain('0  No FAKE findings');
    expect(invocation.stdout).toContain('1  One or more FAKE findings');
    expect(invocation.stdout).toContain('2  Invalid command or input');
    expect(invocation.stdout).toContain('--policy <path>');
  });

  it('documents the exact configuration file-selection description in review help', async () => {
    const invocation = await invoke(['review', '--help']);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout.replace(/\s+/g, ' ')).toContain(
      'JSON configuration file with include and exclude arrays',
    );
  });

  it('uses config excludes to restrict audited files', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('included', () => { expect(value).toBe('ok'); });",
    );
    await writeFile(
      join(root, 'ignored.test.ts'),
      "import { expect, test } from 'vitest'; test('ignored', () => { expect(true).toBe(true); });",
    );
    const configPath = await config(root, '{"exclude":["ignored.test.ts"]}');

    const invocation = await invoke(['review', root, '--config', configPath]);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).not.toContain('ignored');
  });

  it('uses config includes as an explicit source allow-list', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('included', () => { expect(value).toBe('ok'); });",
    );
    await writeFile(
      join(root, 'second.test.ts'),
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );
    const configPath = await config(root, '{"include":["example.test.ts"]}');

    const invocation = await invoke(['review', root, '--config', configPath]);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).not.toContain('fake');
  });

  it('validates optional OpenAI provider configuration without reading a key', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('ok', () => { expect(value).toBe('ok'); });",
    );
    const configPath = await config(
      root,
      '{"semanticProvider":{"kind":"openai","apiKeyEnv":"OPENAI_API_KEY","model":"gpt-5"}}',
    );
    expect((await invoke(['review', root, '--config', configPath])).code).toBe(
      0,
    );
  });

  it('attaches a semantic report without changing static exit semantics', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('unassessed', () => { expect(value).toBe('ok'); });",
    );
    const report = join(root, 'semantic.json');
    await writeFile(
      report,
      '{"version":"1","provider":"offline","inferences":[{"filePath":"example.test.ts","line":1,"confidence":"LOW","summary":"Missing domain context."}]}',
    );

    const invocation = await invoke([
      'review',
      root,
      '--semantic-report',
      report,
      '--format',
      'json',
    ]);

    expect(invocation.code).toBe(0);
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      summary: { unassessed: 1 },
      semantic: {
        provider: 'offline',
        inferences: [{ summary: 'Missing domain context.' }],
      },
    });
  });

  it.each(['{', ''])(
    'returns 2 for an invalid semantic report (%j)',
    async (source) => {
      const root = await fixture(
        "import { expect, test } from 'vitest'; test('ok', () => { expect(value).toBe('ok'); });",
      );
      const report = join(root, 'semantic.json');
      if (source) await writeFile(report, source);

      const invocation = await invoke([
        'review',
        root,
        '--semantic-report',
        report,
      ]);

      expect(invocation.code).toBe(2);
      expect(invocation.stderr).toContain('Semantic report');
    },
  );

  it('attaches mutation evidence without changing static exit semantics', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('unassessed', () => { expect(value).toBe('ok'); });",
    );
    const report = join(root, 'mutation.json');
    await writeFile(
      report,
      '{"version":"1","engine":"stryker","command":"npx stryker run","threshold":{"minimumScore":90,"source":"stryker.conf.json: thresholds.high"},"result":{"totalMutants":10,"killed":8,"survived":2,"score":80}}',
    );

    const invocation = await invoke([
      'review',
      root,
      '--mutation-report',
      report,
      '--format',
      'json',
    ]);

    expect(invocation.code).toBe(0);
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      summary: { unassessed: 1, fake: 0 },
      mutation: {
        engine: 'stryker',
        meetsThreshold: false,
        result: { score: 80 },
      },
    });
  });

  it('returns 2 for an invalid mutation report', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('ok', () => { expect(value).toBe('ok'); });",
    );
    const report = join(root, 'mutation.json');
    await writeFile(report, '{}');

    const invocation = await invoke([
      'review',
      root,
      '--mutation-report',
      report,
    ]);

    expect(invocation.code).toBe(2);
    expect(invocation.stderr).toContain('Mutation report');
  });

  it.each(['{', ''])(
    'returns 2 for an unreadable mutation report (%j)',
    async (source) => {
      const root = await fixture(
        "import { expect, test } from 'vitest'; test('ok', () => { expect(value).toBe('ok'); });",
      );
      const report = join(root, 'mutation.json');
      if (source) await writeFile(report, source);

      const invocation = await invoke([
        'review',
        root,
        '--mutation-report',
        report,
      ]);

      expect(invocation.code).toBe(2);
      expect(invocation.stderr).toContain('Mutation report cannot be read');
    },
  );

  it('never executes the command recorded in mutation evidence', async () => {
    const root = await fixture(
      "import { expect, test } from 'vitest'; test('fake', () => { expect(true).toBe(true); });",
    );
    const marker = join(root, 'mutation-command-executed');
    const report = join(root, 'mutation.json');
    await writeFile(
      report,
      JSON.stringify({
        version: '1',
        engine: 'generic',
        command: `node -e "require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed')"`,
        threshold: { minimumScore: 80, source: 'policy.json' },
        result: { totalMutants: 10, killed: 8, survived: 2, score: 80 },
      }),
    );

    const invocation = await invoke([
      'review',
      root,
      '--mutation-report',
      report,
    ]);

    expect(invocation.code).toBe(1);
    await expect(
      import('node:fs/promises').then(({ access }) => access(marker)),
    ).rejects.toThrow();
  });
});
