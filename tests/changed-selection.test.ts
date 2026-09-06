import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../src/cli';
import {
  ChangedFilesError,
  selectChangedFiles,
} from '../src/core/changed-files';
import { auditPath } from '../src/core/audit';

const run = promisify(execFile);
const roots: string[] = [];
const testSource = "import { test } from 'vitest'; test('case', () => {});\n";

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function repository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ata-changed-'));
  roots.push(root);
  await run('git', ['init', '-q', root]);
  await run('git', ['-C', root, 'config', 'user.email', 'test@example.com']);
  await run('git', ['-C', root, 'config', 'user.name', 'Test']);
  await writeFile(join(root, '.gitignore'), 'ignored.test.ts\n');
  await writeFile(join(root, 'tracked.test.ts'), testSource);
  await writeFile(join(root, 'deleted.test.ts'), testSource);
  await run('git', ['-C', root, 'add', '.']);
  await run('git', ['-C', root, 'commit', '-qm', 'initial']);
  return root;
}

describe('changed-file selection', () => {
  it('includes staged, unstaged, and untracked current files but excludes ignored and deleted files', async () => {
    const root = await repository();
    await writeFile(
      join(root, 'tracked.test.ts'),
      `${testSource}// unstaged\n`,
    );
    await writeFile(join(root, 'staged.test.ts'), testSource);
    await run('git', ['-C', root, 'add', 'staged.test.ts']);
    await writeFile(join(root, 'untracked.test.ts'), testSource);
    await writeFile(join(root, 'space name.test.ts'), testSource);
    await writeFile(join(root, 'line\nbreak.test.ts'), testSource);
    await writeFile(join(root, 'ignored.test.ts'), testSource);
    await rm(join(root, 'deleted.test.ts'));

    const selection = await selectChangedFiles(root, 'HEAD');

    expect(selection.files.map((file) => file.slice(root.length + 1))).toEqual([
      'line\nbreak.test.ts',
      'space name.test.ts',
      'staged.test.ts',
      'tracked.test.ts',
      'untracked.test.ts',
    ]);
  });

  it('intersects changed files with the configured test-file selection', async () => {
    const root = await repository();
    await writeFile(join(root, 'tracked.test.ts'), `${testSource}// changed\n`);
    await writeFile(join(root, 'second.test.ts'), testSource);
    const config = join(root, 'ata.config.json');
    await writeFile(config, '{"exclude":["tracked.test.ts"]}');

    const result = await auditPath(root, {
      changedSince: 'HEAD',
      configPath: config,
    });

    expect(result.selection?.files).toEqual([join(root, 'second.test.ts')]);
  });

  it('selects a rename destination in a nested directory', async () => {
    const root = await repository();
    await run('mkdir', ['-p', join(root, 'nested')]);
    await run('git', [
      '-C',
      root,
      'mv',
      'tracked.test.ts',
      'nested/renamed.test.ts',
    ]);

    const selection = await selectChangedFiles(root, 'HEAD');

    expect(selection.files).toContain(join(root, 'nested', 'renamed.test.ts'));
    expect(selection.files).not.toContain(join(root, 'tracked.test.ts'));
  });

  it('turns an invalid ref into a controlled CLI input error', async () => {
    const root = await repository();
    await expect(
      selectChangedFiles(root, 'missing-ref'),
    ).rejects.toBeInstanceOf(ChangedFilesError);
    let stderr = '';
    const code = await runCli(
      ['review', root, '--changed-since', 'missing-ref'],
      {
        stdout: () => undefined,
        stderr: (text) => {
          stderr += text;
        },
      },
    );

    expect(code).toBe(2);
    expect(stderr).toContain('Changed-since ref');
  });
});
