# Benchmark fixtures

These are intentionally small **source fixtures** for exercising `ata review` and
the versioned `ata benchmark` contract. They are not executed by this project and
may refer to illustrative test dependencies.

The v1 manifest contains twelve small conformance cases: three catalog enhancement fixtures, three matcher-contract fixtures, three unit expression-boundary fixtures, one Node native API assertion fixture, one Node Promise-continuation fixture, and one same-file named-callback fixture. They cover imported aliases, modifiers, bounded `expect.poll` and native `Array.find` callback inspection, Node request-echo comparisons, a fulfillment-skipped `catch`, repeated side-effectful call, property-read, coercion, and fresh-identity classification, local callback resolution, and E2E action-result shadowing/write-only assignments. The callback fixture checks a named function; extractor regression tests also verify direct function variables and reject imports, aliases, shadowing, and statically visible writes. These are representative source fixtures, not per-rule code coverage or runtime-quality evidence:

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
