import assert from 'node:assert/strict';
import { test } from 'node:test';

test('identifies request-echo-only native response comparison', () => {
  assert.deepStrictEqual(response.body, requestBody);
});
