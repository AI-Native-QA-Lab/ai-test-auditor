import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packagePath = resolve(import.meta.dirname, '..', 'package.json');

describe('npm package manifest', () => {
  it('declares the v1.1.1 release version', async () => {
    const manifest = JSON.parse(await readFile(packagePath, 'utf8')) as {
      version?: string;
    };

    expect(manifest.version).toBe('1.1.1');
  });

  it('declares the TypeScript compiler API as a runtime dependency', async () => {
    const manifest = JSON.parse(await readFile(packagePath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(manifest.dependencies?.typescript).toBeDefined();
    expect(manifest.devDependencies?.typescript).toBeUndefined();
  });
});
