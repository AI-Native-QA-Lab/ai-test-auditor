import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BenchmarkError,
  loadBenchmarkManifest,
  runBenchmark,
} from '../../src/core/benchmark';
import { runCli } from '../../src/cli';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function benchmarkFixture(
  source = "import { test, expect } from 'vitest';\ntest('bare expect', () => { expect(result); });",
): Promise<{ readonly root: string; readonly manifestPath: string }> {
  const root = await mkdtemp(join(tmpdir(), 'ata-benchmark-'));
  temporaryRoots.push(root);
  await writeFile(join(root, 'fixture.test.ts'), source);
  const manifestPath = join(root, 'manifest.json');
  return { root, manifestPath };
}

function manifest(
  sourcePath = 'fixture.test.ts',
  overrides: Record<string, unknown> = {},
) {
  return {
    version: '1',
    cases: [
      {
        id: 'unit-bare-expect',
        sourcePath,
        type: 'unit',
        expectedFindings: [{ ruleId: 'UT012', classification: 'FAKE' }],
        nonTriggers: ['UT002'],
        ...overrides,
      },
    ],
  };
}

async function writeManifest(
  manifestPath: string,
  value: unknown,
): Promise<void> {
  await writeFile(manifestPath, JSON.stringify(value));
}

async function invoke(args: readonly string[]): Promise<{
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

describe('benchmark manifest and runner', () => {
  it('loads a valid manifest and validates existing relative source paths', async () => {
    const { manifestPath } = await benchmarkFixture();
    await writeManifest(manifestPath, manifest());

    await expect(loadBenchmarkManifest(manifestPath)).resolves.toMatchObject({
      version: '1',
      cases: [{ id: 'unit-bare-expect', sourcePath: 'fixture.test.ts' }],
    });
  });

  it.each([
    ['missing version', { cases: [] }],
    ['empty cases', { version: '1', cases: [] }],
    ['absolute source path', manifest(resolve('fixture.test.ts'))],
    [
      'unknown rule ID',
      manifest('fixture.test.ts', {
        expectedFindings: [{ ruleId: 'NOPE999', classification: 'FAKE' }],
      }),
    ],
    [
      'duplicate case ID',
      {
        version: '1',
        cases: [
          manifest().cases[0],
          { ...manifest().cases[0], sourcePath: 'fixture.test.ts' },
        ],
      },
    ],
    [
      'expected and non-trigger overlap',
      manifest('fixture.test.ts', { nonTriggers: ['UT012'] }),
    ],
  ])('rejects %s', async (_label, value) => {
    const { manifestPath } = await benchmarkFixture();
    await writeManifest(manifestPath, value);

    await expect(loadBenchmarkManifest(manifestPath)).rejects.toBeInstanceOf(
      BenchmarkError,
    );
  });

  it('returns a passing run with exact finding identities', async () => {
    const { manifestPath } = await benchmarkFixture();
    await writeManifest(manifestPath, manifest());

    await expect(runBenchmark(manifestPath)).resolves.toMatchObject({
      version: '1',
      status: 'passed',
      counts: { total: 1, passed: 1, failed: 0 },
      cases: [
        {
          id: 'unit-bare-expect',
          status: 'passed',
          actualFindings: [{ ruleId: 'UT012', classification: 'FAKE' }],
          missingFindings: [],
          unexpectedFindings: [],
        },
      ],
    });
  });

  it('returns structured mismatch details without executing fixture source', async () => {
    const marker = join(tmpdir(), 'ata-benchmark-executed-' + Date.now());
    const { manifestPath } = await benchmarkFixture(
      "import { writeFileSync } from 'node:fs';\n" +
        "import { test, expect } from 'vitest';\n" +
        'writeFileSync(' +
        JSON.stringify(marker) +
        ", 'executed');\n" +
        "test('bare expect', () => { expect(result); });",
    );
    await writeManifest(manifestPath, {
      ...manifest(),
      cases: [
        {
          ...manifest().cases[0],
          expectedFindings: [{ ruleId: 'UT013', classification: 'FAKE' }],
        },
      ],
    });

    const result = await runBenchmark(manifestPath);

    expect(result).toMatchObject({
      status: 'failed',
      counts: { total: 1, passed: 0, failed: 1 },
      cases: [
        {
          status: 'failed',
          missingFindings: [{ ruleId: 'UT013', classification: 'FAKE' }],
          unexpectedFindings: [{ ruleId: 'UT012', classification: 'FAKE' }],
        },
      ],
    });
    await expect(readFile(marker, 'utf8')).rejects.toThrow();
  });

  it('maps benchmark validation to exit 2 and mismatches to exit 1', async () => {
    const { manifestPath } = await benchmarkFixture();
    await writeManifest(manifestPath, manifest());
    const matching = await invoke([
      'benchmark',
      manifestPath,
      '--format',
      'json',
    ]);
    expect(matching.code).toBe(0);

    await writeManifest(manifestPath, {
      ...manifest(),
      cases: [
        {
          ...manifest().cases[0],
          expectedFindings: [{ ruleId: 'UT013', classification: 'FAKE' }],
        },
      ],
    });
    const failed = await invoke([
      'benchmark',
      manifestPath,
      '--format',
      'json',
    ]);
    expect(failed.code).toBe(1);
    expect(JSON.parse(failed.stdout)).toMatchObject({
      version: '1',
      status: 'failed',
      counts: { total: 1, passed: 0, failed: 1 },
    });

    await writeManifest(manifestPath, { cases: [] });
    const invalid = await invoke([
      'benchmark',
      manifestPath,
      '--format',
      'json',
    ]);
    expect(invalid.code).toBe(2);
    expect(invalid.stdout).toBe('');
    expect(invalid.stderr).toMatch(/^Error: Benchmark/);
  });
});
