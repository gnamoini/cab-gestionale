# Release Baseline Transition — 2026-08-30

## Path

```text
docs/audit/release-gate-baseline-2026-08-29.json  (historical)
        ↓
docs/release-baseline-candidates/2026-08-30/      (CANDIDATE — current)
        ↓
docs/release-baseline/2026-08-30/                 (OFFICIAL — pending CI green)
```

## Candidate (created)

- `release-baseline.json` — `certificationStatus: NOT_CERTIFIED`, `localFullRegression: FAIL`, `ciReleaseCertification: BLOCKED`
- `gate-results.json`, `environment.md`, `promotion-manifest.json`

## Official promotion (blocked)

Promotion requires:

- `certificationStatus = CERTIFIED`
- `ciReleaseCertification = PASS`
- `npm run release:certification:completeness` PASS
- `npm run release:baseline:promote`

Until then, **no** immutable SSOT under `docs/release-baseline/2026-08-30/`.
