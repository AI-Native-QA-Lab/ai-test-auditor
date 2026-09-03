# Benchmark fixtures

These are intentionally small **source fixtures** for exercising `ata review`. They are not executed by this project and may refer to illustrative test dependencies.

After building, run fixtures by test type:

```bash
node dist/cli.js review benchmarks/unit --format json
node dist/cli.js review benchmarks/api --type api --format json
node dist/cli.js review benchmarks/e2e --format json
```

Expected deterministic IDs: `unit/fake-patterns.test.ts` → UT001, UT002, UT003, UT008, UT011; `api/status-only.test.ts` with `--type api` → API001; `e2e/journey.e2e.ts` → E2E001, E2E002, E2E004.
