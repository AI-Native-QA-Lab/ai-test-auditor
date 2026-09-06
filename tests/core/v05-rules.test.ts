import { describe, expect, it } from 'vitest';
import { evaluateRules } from '../../src/core/rule-engine';
import type { TestCase, TestType } from '../../src/core/types';

function review(body: string, type: TestType) {
  const test: TestCase = {
    filePath: 'example.test.ts',
    name: 'example',
    type,
    framework: type === 'e2e' ? 'playwright' : 'vitest',
    line: 10,
    source: `() => {\n${body}\n}`,
    body,
  };
  return evaluateRules(test);
}

const patterns = [
  { id: 'UT004', type: 'unit', expression: 'result', matcher: 'toBeDefined' },
  {
    id: 'API002',
    type: 'api',
    expression: 'response.body',
    matcher: 'toBeTruthy',
  },
  {
    id: 'E2E003',
    type: 'e2e',
    expression: "page.getByRole('heading')",
    matcher: 'toBeVisible',
  },
] as const;

describe.each(patterns)(
  '$id bounded sole-assertion rule',
  ({ id, type, expression, matcher }) => {
    const limited = `expect(${expression}).${matcher}();`;
    it('reports evidence, line and advisory classification', () => {
      expect(review(limited, type)).toContainEqual(
        expect.objectContaining({
          ruleId: id,
          line: 11,
          filePath: 'example.test.ts',
          classification: 'WEAK',
          severity: 'WARNING',
          confidence: 'HIGH',
          message: expect.stringContaining('Static analysis'),
          remediation: expect.any(String),
        }),
      );
    });
    it('reports once for multiple limited assertions', () => {
      expect(
        review(`${limited}\n${limited}`, type).filter((f) => f.ruleId === id),
      ).toHaveLength(1);
    });
    it.each([
      'expect(result).toEqual(expected);',
      'expect(result).not.toBeNull();',
      'expect(load()).resolves.toEqual(expected);',
      'expect(load()).rejects.toThrow();',
      'expect(result);',
    ])(
      'does not label mixed assertions as sole limited assertions: %s',
      (other) => {
        expect(
          review(`${limited}\n${other}`, type).map((f) => f.ruleId),
        ).not.toContain(id);
      },
    );
    it('does not flag no assertion or an unsupported matcher signature', () => {
      expect(review('run();', type).map((f) => f.ruleId)).not.toContain(id);
      expect(
        review(`expect(${expression}).${matcher}(options);`, type).map(
          (f) => f.ruleId,
        ),
      ).not.toContain(id);
    });
    it('does not cross category boundaries', () => {
      for (const other of ['unit', 'api', 'e2e'] as const) {
        if (other !== type)
          expect(review(limited, other).map((f) => f.ruleId)).not.toContain(id);
      }
    });
  },
);

it('recognizes both existence matchers and both direct response fields', () => {
  expect(
    review(
      'expect(result).toBeTruthy(); expect(other).toBeDefined();',
      'unit',
    ).map((f) => f.ruleId),
  ).toContain('UT004');
  expect(
    review(
      'expect(response.body).toBeDefined(); expect(response.data).toBeTruthy();',
      'api',
    ).map((f) => f.ruleId),
  ).toContain('API002');
});

it.each(['response.body.id', 'body', 'other.body', 'response.status'])(
  'does not infer response body aliases or nested contracts: %s',
  (expression) => {
    expect(
      review(`expect(${expression}).toBeDefined();`, 'api').map(
        (f) => f.ruleId,
      ),
    ).not.toContain('API002');
  },
);
