import { describe, expect, it } from 'vitest';
import { validateBilingualPublicMarkers } from '../src/docs-contract';

describe('bilingual public-document markers', () => {
  it('keeps policy exit semantics, ordered roadmap phases, and bilingual markers aligned', async () => {
    await expect(validateBilingualPublicMarkers()).resolves.toEqual([]);
  });
});
