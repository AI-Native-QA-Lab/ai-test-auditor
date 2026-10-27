import { expect as verify, test as spec } from 'vitest';

spec('fresh expression identities remain weak-only', () => {
  verify([]).toBe([]);
});
