# Benchmark fixtures

These are intentionally small **source fixtures** for exercising `ata review` and
the versioned `ata benchmark` contract. They are not executed by this project and
may refer to illustrative test dependencies.

The v1.2 manifest covers the 10 Unit, 10 API, and 10 E2E rule catalogs:

```bash
npm run benchmark
```

`ata benchmark` reads source, compares exact `{ ruleId, classification }`
identities, and reports fixture conformance. It does not import or execute the
fixture source. A malformed manifest exits `2`; a valid manifest with mismatches
exits `1`.

After building, run fixtures by test type:

```bash
node dist/cli.js review benchmarks/unit --format json
node dist/cli.js review benchmarks/api --type api --format json
node dist/cli.js review benchmarks/e2e --format json
```

Expected deterministic IDs: `unit/fake-patterns.test.ts` → UT001, UT002, UT003, UT008, UT011; `api/status-only.test.ts` with `--type api` → API001; `e2e/journey.e2e.ts` → E2E001, E2E002, E2E004.
