import assert from 'node:assert/strict';
import { test } from 'node:test';

test('continues through a catch that cannot run', async () => {
  await Promise.resolve(1)
    .catch(() => {})
    .then(() => assert.strictEqual(actual, expected));
});
