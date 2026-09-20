import { describe, expect, it } from 'vitest';
import { AuditConfigError, parseAuditConfig } from '../../src/core/config';

describe('audit config', () => {
  it('normalizes a legacy config without changing include or exclude behavior', () => {
    expect(
      parseAuditConfig({
        include: ['example.test.ts'],
        exclude: ['generated.test.ts'],
      }),
    ).toEqual({
      version: '1',
      include: ['example.test.ts'],
      exclude: ['generated.test.ts'],
      semanticProvider: { kind: 'offline' },
    });
  });

  it('preserves a validated semantic provider without reading credentials', () => {
    expect(
      parseAuditConfig({
        version: '1',
        include: [],
        exclude: [],
        semanticProvider: {
          kind: 'openai',
          apiKeyEnv: 'OPENAI_API_KEY',
          model: 'gpt-5',
        },
      }),
    ).toMatchObject({
      version: '1',
      semanticProvider: {
        kind: 'openai',
        apiKeyEnv: 'OPENAI_API_KEY',
        model: 'gpt-5',
      },
    });
  });

  it.each([
    ['unknown config field', { include: [], exclude: [], extra: true }],
    ['unsupported version', { version: '2', include: [], exclude: [] }],
    ['null version', { version: null, include: [], exclude: [] }],
    ['non-string include entry', { include: [1], exclude: [] }],
    ['null include', { include: null, exclude: [] }],
    ['empty exclude pattern', { include: [], exclude: ['  '] }],
    ['null exclude', { include: [], exclude: null }],
    [
      'unsupported provider',
      { include: [], exclude: [], semanticProvider: { kind: 'local' } },
    ],
  ])('rejects %s', (_label, value) => {
    expect(() => parseAuditConfig(value)).toThrow(AuditConfigError);
  });
});
