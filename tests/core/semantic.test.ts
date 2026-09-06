import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  parseSemanticReport,
  resolveSemanticProvider,
} from '../../src/core/semantic';

describe('semantic report contract', () => {
  it('accepts a versioned offline inference without changing deterministic evidence', () => {
    expect(
      parseSemanticReport({
        version: '1',
        provider: 'offline',
        inferences: [
          {
            filePath: 'tests/order.test.ts',
            line: 8,
            confidence: 'LOW',
            summary: 'The assertion may omit a business postcondition.',
          },
        ],
      }),
    ).toMatchObject({
      provider: 'offline',
      inferences: [{ confidence: 'LOW' }],
    });
  });

  it('rejects reports without the required versioned evidence fields', () => {
    expect(() =>
      parseSemanticReport({ provider: 'offline', inferences: [] }),
    ).toThrow('Semantic report');
  });

  it('uses offline by default and validates optional provider configuration', () => {
    expect(resolveSemanticProvider(undefined)).toEqual({ kind: 'offline' });
    expect(
      resolveSemanticProvider({
        kind: 'openai',
        apiKeyEnv: 'OPENAI_API_KEY',
        model: 'gpt-test',
      }),
    ).toMatchObject({ kind: 'openai', apiKeyEnv: 'OPENAI_API_KEY' });
    expect(() =>
      resolveSemanticProvider({ kind: 'anthropic', apiKeyEnv: '' }),
    ).toThrow('apiKeyEnv');
  });

  it('validates the versioned semantic evaluation corpus', async () => {
    const corpus = JSON.parse(
      await readFile(
        new URL(
          '../../test-quality-audit/evals/semantic-report-v1.json',
          import.meta.url,
        ),
        'utf8',
      ),
    ) as {
      readonly version: string;
      readonly cases: readonly {
        readonly accepted: boolean;
        readonly report: unknown;
      }[];
    };

    expect(corpus.version).toBe('1');
    expect(corpus.cases.length).toBeGreaterThan(1);
    expect(
      corpus.cases
        .filter((testCase) => testCase.accepted)
        .map(
          (testCase) =>
            (testCase.report as { readonly provider?: unknown }).provider,
        )
        .sort(),
    ).toEqual(['anthropic', 'offline', 'openai']);
    for (const testCase of corpus.cases) {
      if (testCase.accepted) {
        expect(() => parseSemanticReport(testCase.report)).not.toThrow();
      } else {
        expect(() => parseSemanticReport(testCase.report)).toThrow(
          'Semantic report',
        );
      }
    }
  });
});
