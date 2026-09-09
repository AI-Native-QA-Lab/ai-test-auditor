import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GatePolicyError,
  loadGatePolicy,
  parseGatePolicy,
} from '../../src/core/gate-policy';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

const gatePolicy = {
  version: '1',
  id: 'repository-static-fake-gate',
  mode: 'gate',
  blockOn: ['FAKE'],
};

describe('FAKE-only gate policy', () => {
  it('accepts the exact v1 FAKE gate contract', () => {
    expect(parseGatePolicy(gatePolicy)).toEqual(gatePolicy);
  });

  it.each([
    { ...gatePolicy, id: undefined },
    { ...gatePolicy, id: '   ' },
    { ...gatePolicy, version: '2' },
    { ...gatePolicy, mode: 'advisory' },
    { ...gatePolicy, blockOn: [] },
    { ...gatePolicy, blockOn: ['WEAK'] },
    { ...gatePolicy, blockOn: ['FAKE', 'WEAK'] },
    { ...gatePolicy, blockOn: ['FAKE', 'FAKE'] },
    { ...gatePolicy, blockOn: ['INVALID'] },
    { ...gatePolicy, extra: true },
  ])('rejects an invalid gate policy: %#', (policy) => {
    expect(() => parseGatePolicy(policy)).toThrow(GatePolicyError);
  });

  it('normalizes malformed and unreadable policy files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ata-gate-policy-'));
    temporaryRoots.push(root);
    const malformed = join(root, 'malformed.json');
    await writeFile(malformed, '{');

    await expect(loadGatePolicy(malformed)).rejects.toThrow(GatePolicyError);
    await expect(loadGatePolicy(join(root, 'missing.json'))).rejects.toThrow(
      GatePolicyError,
    );
  });
});
