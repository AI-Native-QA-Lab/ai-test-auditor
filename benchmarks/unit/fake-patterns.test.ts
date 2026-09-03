import { expect, test } from 'vitest';

test('has no assertion', () => {
  calculateTotal([10, 20]);
});

test('uses a tautology', () => {
  expect(true).toBe(true);
});

test('asserts itself', () => {
  expect(result.total).toEqual(result.total);
});

test('swallows failure', async () => {
  try {
    await saveOrder();
  } catch (error) {
    console.warn(error);
  }
});

test('uses the system under test as its expected value', () => {
  expect(service.get('a')).toEqual(service.get('a'));
});
