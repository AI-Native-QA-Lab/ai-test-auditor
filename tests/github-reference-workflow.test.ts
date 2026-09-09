import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { parseDecisionEnvelope } from '../src/core/decision';
import { parseGatePolicy } from '../src/core/gate-policy';

const run = promisify(execFile);
const temporaryRoots: string[] = [];
const projectRoot = resolve(import.meta.dirname, '..');
const projectionScript = join(
  projectRoot,
  '.github/scripts/create-decision-envelope.mjs',
);
const referenceWorkflow = join(
  projectRoot,
  '.github/workflows/audit-reference.yml',
);
const gateWorkflow = join(
  projectRoot,
  '.github/workflows/audit-gate-reference.yml',
);
const gatePolicy = join(projectRoot, '.github/ata-gate-policy.json');

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function writeAudit(value: unknown): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ata-github-reference-'));
  temporaryRoots.push(root);
  const path = join(root, 'audit.json');
  await writeFile(path, JSON.stringify(value));
  return path;
}

const audit = {
  tests: [
    {
      filePath: 'tests/example.test.ts',
      name: 'literal assertion',
      framework: 'vitest',
      type: 'unit',
      line: 4,
      source: '() => { expect(true).toBe(true); }',
      body: '{ expect(true).toBe(true); }',
    },
  ],
  findings: [
    {
      ruleId: 'UT002',
      severity: 'CRITICAL',
      classification: 'FAKE',
      confidence: 'HIGH',
      filePath: 'tests/example.test.ts',
      line: 4,
      message: 'The same literal appears on both sides.',
      remediation: 'Use an independent expected value.',
    },
  ],
  summary: {
    total: 1,
    assessed: 1,
    fake: 1,
    weak: 0,
    invalid: 0,
    unassessed: 0,
    fakeTestRatio: 100,
    trustScore: 75,
  },
  diagnostics: [
    {
      filePath: 'tests/broken.test.ts',
      message: 'Syntax error',
      line: 1,
    },
  ],
  selection: {
    mode: 'changed-since',
    requestedBaseRef: 'abc123',
    baseCommit: 'abc123',
    files: ['tests/example.test.ts'],
  },
  policy: {
    version: '1',
    id: 'local-policy',
    mode: 'advisory',
    disabledRuleIds: ['UT002'],
    disabledFindingCount: 1,
    activeFindingCount: 0,
  },
  baseline: {
    version: '1',
    id: 'main',
    historicalFindingCount: 1,
    newFindingCount: 0,
  },
  semantic: { version: '1' },
  mutation: { version: '1' },
};

describe('GitHub reference workflow envelope projection', () => {
  it('projects only strict decision fields and context IDs from audit JSON', async () => {
    const auditPath = await writeAudit(audit);

    const { stdout, stderr } = await run('node', [projectionScript, auditPath]);

    expect(stderr).toBe('');
    const envelope = JSON.parse(stdout);
    expect(envelope).toEqual({
      version: '1',
      audit: {
        tests: audit.tests,
        findings: audit.findings,
        summary: audit.summary,
        policy: { version: '1', id: 'local-policy', mode: 'advisory' },
        baseline: { version: '1', id: 'main' },
      },
    });
    expect(parseDecisionEnvelope(envelope)).toEqual(envelope);
  });

  it.each(['{', JSON.stringify({ tests: [], findings: [] })])(
    'fails without partial output for invalid audit JSON: %s',
    async (source) => {
      const root = await mkdtemp(join(tmpdir(), 'ata-github-reference-'));
      temporaryRoots.push(root);
      const auditPath = join(root, 'audit.json');
      await writeFile(auditPath, source);

      await expect(
        run('node', [projectionScript, auditPath]),
      ).rejects.toMatchObject({
        stdout: '',
      });
    },
  );
});

describe('GitHub reference workflow', () => {
  it('uses changed test files, least privilege, and the original audit exit', async () => {
    const workflow = await readFile(referenceWorkflow, 'utf8');

    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toMatch(/base-ref:[\s\S]*required: true/);
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('fetch-depth: 0');
    expect(workflow).toContain('node-version: 20');
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('github.event.pull_request.base.sha');
    expect(workflow).toContain('inputs.base-ref');
    expect(workflow).toContain(
      'node dist/cli.js review . --changed-since "$BASE_REF" --format json',
    );
    expect(workflow).toContain(
      'node .github/scripts/create-decision-envelope.mjs',
    );
    expect(workflow).toContain('node dist/cli.js decision');
    expect(workflow).toContain('set +e');
    expect(workflow).toContain('audit_exit=$?');
    expect(workflow).toContain('"$audit_exit" -eq 2');
    expect(workflow).toContain('$GITHUB_STEP_SUMMARY');
    expect(workflow).toContain('exit "$audit_exit"');

    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('github-token');
    expect(workflow).not.toContain('GITHUB_TOKEN');
    expect(workflow).not.toContain('actions/github-script');
    expect(workflow).not.toContain('checks: write');
    expect(workflow).not.toContain('pull-requests: write');
  });
});

describe('GitHub opt-in gate reference workflow', () => {
  it('captures review status before forwarding the explicit gate status', async () => {
    await expect(readFile(gatePolicy, 'utf8')).resolves.toContain('"FAKE"');
    expect(
      parseGatePolicy(JSON.parse(await readFile(gatePolicy, 'utf8'))),
    ).toEqual({
      version: '1',
      id: 'repository-static-fake-gate',
      mode: 'gate',
      blockOn: ['FAKE'],
    });

    const workflow = await readFile(gateWorkflow, 'utf8');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toMatch(/base-ref:[\s\S]*required: true/);
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('fetch-depth: 0');
    expect(workflow).toContain('node-version: 20');
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain(
      'node dist/cli.js review . --changed-since "$BASE_REF" --format json',
    );
    expect(workflow).toContain('set +e');
    expect(workflow).toContain('audit_exit=$?');
    expect(workflow).toContain('"$audit_exit" -ne 0');
    expect(workflow).toContain('"$audit_exit" -ne 1');
    expect(workflow).toContain('exit 2');
    expect(workflow).toContain(
      'node .github/scripts/create-decision-envelope.mjs',
    );
    expect(workflow).toContain('projection_exit=$?');
    expect(workflow).toContain('Unexpected audit projection exit code');
    expect(workflow).toContain(
      'node dist/cli.js gate .github/ata-gate-policy.json',
    );
    expect(workflow).toContain('gate_exit=$?');
    expect(workflow).toContain('exit "$gate_exit"');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('GITHUB_TOKEN');
    expect(workflow).not.toContain('github-token');
    expect(workflow).not.toContain('actions/github-script');
    expect(workflow).not.toContain('gh ');
    expect(workflow).not.toContain('curl');
    expect(workflow).not.toContain('checks: write');
    expect(workflow).not.toContain('pull-requests: write');
    expect(workflow).not.toContain('ata decision');
  });
});
