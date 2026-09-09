import { readFile } from 'node:fs/promises';
import type { GatePolicy } from './types.js';

export type { GatePolicy } from './types.js';

export class GatePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GatePolicyError';
  }
}

export function parseGatePolicy(value: unknown): GatePolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GatePolicyError('Gate policy must be an object.');
  }

  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate).sort();
  if (
    JSON.stringify(keys) !==
      JSON.stringify(['blockOn', 'id', 'mode', 'version']) ||
    candidate.version !== '1' ||
    typeof candidate.id !== 'string' ||
    candidate.id.trim() === '' ||
    candidate.mode !== 'gate' ||
    !isFakeOnly(candidate.blockOn)
  ) {
    throw new GatePolicyError(
      'Gate policy must contain version "1", a non-empty id, gate mode, and blockOn ["FAKE"].',
    );
  }

  return {
    version: '1',
    id: candidate.id,
    mode: 'gate',
    blockOn: ['FAKE'],
  };
}

export async function loadGatePolicy(path: string): Promise<GatePolicy> {
  try {
    return parseGatePolicy(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (error instanceof GatePolicyError) throw error;
    throw new GatePolicyError(`Gate policy cannot be read: ${path}`);
  }
}

function isFakeOnly(value: unknown): value is readonly ['FAKE'] {
  return Array.isArray(value) && value.length === 1 && value[0] === 'FAKE';
}
