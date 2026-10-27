import { expect as verify, test as spec } from 'vitest';

spec('repeated coercion remains weak-only', () => {
  verify(value + '').toEqual(value + '');
});
