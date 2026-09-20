import { readFile } from 'node:fs/promises';
import type { SemanticProviderConfig } from './semantic.js';
import { resolveSemanticProvider } from './semantic.js';

export interface AuditConfig {
  readonly version: '1';
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly semanticProvider?: SemanticProviderConfig;
}

export class AuditConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditConfigError';
  }
}

export function parseAuditConfig(value: unknown): AuditConfig {
  if (!isRecord(value)) {
    throw new AuditConfigError('Config must be an object.');
  }
  if (
    !hasOnlyKeys(value, ['version', 'include', 'exclude', 'semanticProvider'])
  ) {
    throw new AuditConfigError(
      'Config contains unknown fields. Use version, include, exclude, or semanticProvider.',
    );
  }

  const version = value.version === undefined ? '1' : value.version;
  if (version !== '1') {
    throw new AuditConfigError('Config version must be "1".');
  }
  const include = parsePatterns(value.include, 'include');
  const exclude = parsePatterns(value.exclude, 'exclude');
  validateSemanticProviderShape(value.semanticProvider);

  let semanticProvider: SemanticProviderConfig;
  try {
    semanticProvider = resolveSemanticProvider(value.semanticProvider);
  } catch (error) {
    throw new AuditConfigError(
      error instanceof Error
        ? error.message
        : 'Semantic provider configuration is invalid.',
    );
  }

  return {
    version: '1',
    include,
    exclude,
    semanticProvider,
  };
}

export async function loadAuditConfig(path: string): Promise<AuditConfig> {
  try {
    return parseAuditConfig(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (error instanceof AuditConfigError) throw error;
    throw new AuditConfigError('Config cannot be read: ' + path);
  }
}

function parsePatterns(value: unknown, label: string): string[] {
  const patterns = value === undefined ? [] : value;
  if (
    !Array.isArray(patterns) ||
    !patterns.every(
      (pattern): pattern is string =>
        typeof pattern === 'string' && pattern.trim() !== '',
    )
  ) {
    throw new AuditConfigError(
      'Config ' + label + ' must be an array of non-empty strings.',
    );
  }
  return [...patterns];
}

function validateSemanticProviderShape(value: unknown): void {
  if (value === undefined) return;
  if (!isRecord(value) || !hasOnlyKeys(value, ['kind', 'apiKeyEnv', 'model'])) {
    throw new AuditConfigError(
      'Semantic provider contains unknown or missing fields.',
    );
  }
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
