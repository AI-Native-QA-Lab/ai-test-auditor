/* global process */

import { readFile } from 'node:fs/promises';

function fail(message) {
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
}

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function context(value, name) {
  if (!object(value) || typeof value.id !== 'string' || value.id.length === 0) {
    throw new Error(`Audit ${name} is invalid.`);
  }
  return value;
}

async function main() {
  const [path] = process.argv.slice(2);
  if (!path || process.argv.length !== 3) {
    throw new Error('Expected exactly one audit JSON path.');
  }

  const audit = JSON.parse(await readFile(path, 'utf8'));
  if (
    !object(audit) ||
    !Array.isArray(audit.tests) ||
    !Array.isArray(audit.findings) ||
    !object(audit.summary)
  ) {
    throw new Error('Audit JSON must contain tests, findings, and summary.');
  }

  const envelope = {
    version: '1',
    audit: {
      tests: audit.tests,
      findings: audit.findings,
      summary: audit.summary,
      ...(audit.policy
        ? {
            policy: {
              version: '1',
              id: context(audit.policy, 'policy').id,
              mode: 'advisory',
            },
          }
        : {}),
      ...(audit.baseline
        ? {
            baseline: {
              version: '1',
              id: context(audit.baseline, 'baseline').id,
            },
          }
        : {}),
    },
  };

  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : 'Invalid audit JSON.');
});
