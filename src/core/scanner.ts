import { readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const ignoredDirectories = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
]);
const testFilePattern = /(?:\.(?:test|spec)\.(?:ts|tsx|js)|\.e2e\.ts)$/;

export async function scanFiles(root: string): Promise<string[]> {
  const absoluteRoot = resolve(root);
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = join(directory, entry.name);

        if (entry.isDirectory()) {
          if (!ignoredDirectories.has(entry.name)) {
            await visit(entryPath);
          }
          return;
        }

        if (entry.isFile() && testFilePattern.test(entry.name)) {
          files.push(entryPath);
        }
      }),
    );
  }

  await visit(absoluteRoot);
  return files.sort();
}
