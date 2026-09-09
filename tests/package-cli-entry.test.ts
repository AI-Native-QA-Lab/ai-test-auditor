import { execFile } from 'node:child_process';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const projectRoot = resolve(import.meta.dirname, '..');
const cliPath = join(projectRoot, 'dist', 'cli.js');
const require = createRequire(import.meta.url);
const compilerPath = require.resolve('typescript/bin/tsc');

describe('npm CLI entry point', () => {
  it('runs when invoked through an npm-style symbolic link', async () => {
    await run(process.execPath, [compilerPath, '--project', projectRoot]);
    const root = await mkdtemp(join(tmpdir(), 'ata-cli-entry-'));
    const link = join(root, 'ata');
    await symlink(cliPath, link);

    try {
      const { stdout, stderr } = await run(process.execPath, [link, '--help']);

      expect(stdout).toContain('Usage: ata');
      expect(stderr).toBe('');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
