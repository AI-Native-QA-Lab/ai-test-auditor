import { expect as verify, test as spec } from 'vitest';

spec('polling the same literal is a deterministic fake', async () => {
  await verify.poll(() => 3).toBe(3);
});

spec('negated equality is not a passing fake assertion', () => {
  verify(3).not.toBe(3);
});

spec('soft mock interaction remains a weak-only signal', () => {
  verify.soft(mock).toHaveBeenCalled();
});

spec('assertions inside native array callbacks remain visible', () => {
  [1].find((value) => {
    verify(value).toBe(1);
    return true;
  });
});

spec('repeated stateful calls remain a weak finding', () => {
  verify(read()).toEqual(read());
});
