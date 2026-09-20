import { expect, test } from 'vitest';

test('bare expect', () => {
  expect(result);
});

test('zero assertion count contradicts a matcher', () => {
  expect.assertions(0);
  expect(result).toBe(expected);
});

test('mock interaction only', () => {
  expect(mock).toHaveBeenCalled();
});

test('snapshot only', () => {
  expect(value).toMatchSnapshot();
});

test('meaningful value assertion is not a sole-pattern hint', () => {
  expect(result).toEqual(expected);
});
