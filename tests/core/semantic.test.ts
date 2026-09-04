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
});
