import { describe, expect, it } from 'vitest';
import { validateBilingualPublicMarkers } from '../src/docs-contract';

describe('bilingual public-document markers', () => {
  it('keeps bilingual public documents, v1 context, and Chinese history markers aligned', async () => {
    await expect(validateBilingualPublicMarkers()).resolves.toEqual([]);
  });
});
