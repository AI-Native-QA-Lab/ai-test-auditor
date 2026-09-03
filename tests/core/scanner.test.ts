import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanFiles } from '../../src/core/scanner';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) =>
        import('node:fs/promises').then(({ rm }) =>
          rm(root, { recursive: true, force: true }),
        ),
      ),
  );
});

async function createSourceTree(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ata-scanner-'));
  temporaryRoots.push(root);

  await Promise.all([
    mkdir(join(root, 'nested'), { recursive: true }),
    mkdir(join(root, 'node_modules', 'package'), { recursive: true }),
    mkdir(join(root, 'dist'), { recursive: true }),
    mkdir(join(root, '.git'), { recursive: true }),
    mkdir(join(root, 'coverage'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(join(root, 'unit.test.ts'), ''),
    writeFile(join(root, 'component.test.tsx'), ''),
    writeFile(join(root, 'legacy.test.js'), ''),
    writeFile(join(root, 'unit.spec.ts'), ''),
    writeFile(join(root, 'component.spec.tsx'), ''),
    writeFile(join(root, 'legacy.spec.js'), ''),
    writeFile(join(root, 'nested', 'journey.e2e.ts'), ''),
    writeFile(join(root, 'nested', 'helper.ts'), ''),
    writeFile(join(root, 'node_modules', 'package', 'ignored.test.ts'), ''),
    writeFile(join(root, 'dist', 'ignored.spec.js'), ''),
    writeFile(join(root, '.git', 'ignored.test.ts'), ''),
    writeFile(join(root, 'coverage', 'ignored.e2e.ts'), ''),
  ]);

  return root;
}

describe('scanFiles', () => {
  it('discovers supported test names and excludes generated and dependency directories', async () => {
    const root = await createSourceTree();

    const files = await scanFiles(root);

    expect(files).toEqual(
      [
        'component.spec.tsx',
        'component.test.tsx',
        'legacy.spec.js',
        'legacy.test.js',
        'nested/journey.e2e.ts',
        'unit.spec.ts',
        'unit.test.ts',
      ].map((file) => resolve(root, file)),
    );
  });
});
