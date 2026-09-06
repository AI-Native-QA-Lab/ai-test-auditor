import { describe, expect, it } from 'vitest';
import { validateBilingualPublicMarkers } from '../src/docs-contract';

describe('bilingual public-document markers', () => {
  it('keeps shared rule IDs, classifications, exit codes, and key option markers aligned', async () => {
    await expect(validateBilingualPublicMarkers()).resolves.toEqual([]);
  });
});
