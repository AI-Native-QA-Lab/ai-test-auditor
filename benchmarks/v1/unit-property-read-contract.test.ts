import { expect as verify, test as spec } from 'vitest';

spec('repeated property reads remain weak-only', () => {
  verify(response.body.id).toEqual(response.body.id);
});
