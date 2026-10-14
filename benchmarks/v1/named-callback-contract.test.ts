import { expect, test } from 'vitest';

function namedCallback() {
  expect(3).toBe(3);
}

test('uses a same-file named callback', namedCallback);
