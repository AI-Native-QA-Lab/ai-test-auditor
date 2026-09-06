import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import type { FileSelection } from './types.js';

const run = promisify(execFile);

export class ChangedFilesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChangedFilesError';
  }
}

export async function selectChangedFiles(
  root: string,
  baseRef: string,
): Promise<FileSelection> {
  const cwd = resolve(root);
  let baseCommit: string;
  try {
    ({ stdout: baseCommit } = await run(
      'git',
      [
        '-C',
        cwd,
        'rev-parse',
        '--verify',
        '--end-of-options',
        `${baseRef}^{commit}`,
      ],
      { timeout: 5000 },
    ));
  } catch {
    throw new ChangedFilesError(
      `Changed-since ref is invalid or unavailable: ${baseRef}`,
    );
  }
  try {
    const { stdout } = await run(
      'git',
      [
        '-C',
        cwd,
        '-c',
        'core.quotepath=false',
        'diff',
        '--name-only',
        '-z',
        '--diff-filter=ACMR',
        baseCommit.trim(),
        '--',
      ],
      { timeout: 5000, maxBuffer: 4 * 1024 * 1024 },
    );
    const changed = stdout
      .split('\0')
      .filter(Boolean)
      .map((file) => resolve(cwd, file));
    const { stdout: status } = await run(
      'git',
      ['-C', cwd, 'status', '--porcelain=v1', '-z', '--untracked-files=all'],
      { timeout: 5000, maxBuffer: 4 * 1024 * 1024 },
    );
    const untracked = status
      .split('\0')
      .filter((entry) => entry.startsWith('?? '))
      .map((entry) => resolve(cwd, entry.slice(3)));
    return {
      mode: 'changed-since',
      requestedBaseRef: baseRef,
      baseCommit: baseCommit.trim(),
      files: [...new Set([...changed, ...untracked])].sort(),
    };
  } catch {
    throw new ChangedFilesError(`Could not inspect changed files in: ${cwd}`);
  }
}
