import { readFile } from 'node:fs/promises';

export type SemanticProviderKind = 'offline' | 'openai' | 'anthropic';

export interface SemanticInference {
  readonly filePath: string;
  readonly line: number;
  readonly confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly summary: string;
}
export interface SemanticReport {
  readonly version: '1';
  readonly provider: SemanticProviderKind;
  readonly inferences: readonly SemanticInference[];
}
export interface SemanticProviderConfig {
  readonly kind: SemanticProviderKind;
  readonly apiKeyEnv?: string;
  readonly model?: string;
}

export function parseSemanticReport(value: unknown): SemanticReport {
  if (!value || typeof value !== 'object')
    throw new Error('Semantic report must be an object.');
  const candidate = value as Record<string, unknown>;
  if (
    candidate.version !== '1' ||
    !isProvider(candidate.provider) ||
    !Array.isArray(candidate.inferences)
  )
    throw new Error(
      'Semantic report must contain version "1", a provider, and inferences.',
    );
  return {
    version: '1',
    provider: candidate.provider,
    inferences: candidate.inferences.map(parseInference),
  };
}

export async function loadSemanticReport(
  path: string,
): Promise<SemanticReport> {
  try {
    return parseSemanticReport(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Semantic report'))
      throw error;
    throw new Error(`Semantic report cannot be read: ${path}`);
  }
}

export function resolveSemanticProvider(
  value: unknown,
): SemanticProviderConfig {
  if (value === undefined) return { kind: 'offline' };
  if (!value || typeof value !== 'object')
    throw new Error('Semantic provider configuration must be an object.');
  const candidate = value as Record<string, unknown>;
  if (!isProvider(candidate.kind))
    throw new Error(
      'Semantic provider kind must be offline, openai, or anthropic.',
    );
  if (candidate.kind === 'offline') return { kind: 'offline' };
  if (
    typeof candidate.apiKeyEnv !== 'string' ||
    candidate.apiKeyEnv.trim() === ''
  )
    throw new Error(
      'Semantic provider apiKeyEnv must name a non-empty environment variable.',
    );
  if (candidate.model !== undefined && typeof candidate.model !== 'string')
    throw new Error('Semantic provider model must be a string.');
  return {
    kind: candidate.kind,
    apiKeyEnv: candidate.apiKeyEnv,
    model: candidate.model as string | undefined,
  };
}

function parseInference(value: unknown): SemanticInference {
  if (!value || typeof value !== 'object')
    throw new Error('Semantic report inference must be an object.');
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.filePath !== 'string' ||
    typeof candidate.line !== 'number' ||
    !['LOW', 'MEDIUM', 'HIGH'].includes(candidate.confidence as string) ||
    typeof candidate.summary !== 'string'
  )
    throw new Error('Semantic report inference has invalid evidence fields.');
  return {
    filePath: candidate.filePath,
    line: candidate.line,
    confidence: candidate.confidence as SemanticInference['confidence'],
    summary: candidate.summary,
  };
}
function isProvider(value: unknown): value is SemanticProviderKind {
  return value === 'offline' || value === 'openai' || value === 'anthropic';
}
