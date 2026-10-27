import { expect as verify, test as spec } from 'vitest';

spec('polls until a response body exists', async () => {
  await verify.poll(() => response.body).toBeTruthy();
});

spec('compares a response body against the request only', () => {
  verify(response.body).not.toEqual(requestBody);
});
