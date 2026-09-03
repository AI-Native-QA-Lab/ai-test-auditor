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

  it('documents all exit codes in review help', async () => {
    const invocation = await invoke(['review', '--help']);

    expect(invocation.code).toBe(0);
    expect(invocation.stdout).toContain('0  No FAKE findings');
    expect(invocation.stdout).toContain('1  One or more FAKE findings');
    expect(invocation.stdout).toContain('2  Invalid command or input');
  });
});
