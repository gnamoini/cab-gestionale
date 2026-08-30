# Release gate — single authority (GitHub Actions)

**Autorità unica:** il workflow GitHub Actions `release-gate` è l’unico sistema che **blocca merge e deploy** in production. Vercel **non** esegue gate, `production:check`, né script di decisione build: fa solo `npm run build` (`next build`) su commit già ammessi su `main`.

**Contratto SSOT:** [`release-gate-contract.md`](./release-gate-contract.md) + [`release-gate-contract.json`](./release-gate-contract.json).

Workflow complementari: [`release-gate-cert`](../.github/workflows/release-gate-cert.yml) (tier 2 su `main`) e [`release-gate-nightly`](../.github/workflows/release-gate-nightly.yml) (tier 3 advisory). Matrice: [`gate-matrix.md`](./gate-matrix.md). Audit freshness: [`audit/release-gate-freshness-2026-08-29.md`](./audit/release-gate-freshness-2026-08-29.md).

Se un controllo critico fallisce in CI → check rosso → merge bloccato → production Vercel non promossa (Deployment Protection).

**Control Plane:** `control-pr` è **contract-compatible** (non dual-required). Vedi contratto RELEASE_READY.

## Controlli attivi in CI (`release-gate`)

| # | Comando | Cosa verifica |
|---|---------|----------------|
| 1 | `npm run ci:tsc` | `npx tsc --noEmit` |
| 2 | `npm run ci:build` | `npm run build` + bundle budget |
| 3 | `npm run test:rbac` | RBAC matrix, route matrix, role parity |
| 4 | `npm run test:rbac:hardening` | RBAC entrypoint, SSR/client parity, cache |
| 5 | `npm run test:security:remediation` | SECURITY DEFINER, RPC manifest, portal isolation (17 test) |
| 6 | `npm run ux:enforce` | `window.alert/confirm/prompt`, `useToast` fuori allowlist |
| 7 | `npm run audit:ui` | UI design consistency audit |
| 8 | `npm run ux:mobile-gate` | Tooltip mobile, scroll-lock modali |
| 9 | `npm run ios:check` | Heuristics iOS/Safari static |
| 10 | Verify Supabase secrets | Presenza env in Actions |
| 11 | `verify-supabase-ci-env.ts` | Connessione Supabase |
| 12 | `npm run production:check` | RBAC/RLS, storage, pilot flags, legacy URL |
| 13 | `npm run ci:supabase:publication` | Publication realtime sanity |
| 14 | `npm run smoke:structural` | Shell modali, layout app-shell |
| 15 | `npm run smoke:regression:core` | **278** test CORE — SSOT [`smoke-regression-lists.ts`](../lib/regression/smoke-regression-lists.ts) |
| 16 | `npm run flex:eslint:gate` | Flex baseline — no nuove violazioni |
| 17 | `npm run flex:freeze:gate` | Integrità freeze flex |
| 18 | `release-ready-contract.test.ts` | Conformità contratto RELEASE_READY |
| 19 | `npm run smoke:playwright` | Spec 01–12 E2E chromium (spec 13/14 **esclusi** via `testIgnore`) |
| 20 | `npm run smoke:cleanup` (apply) | Teardown dati smoke |

`production:check` aggrega: **rbac-rls**, **storage**, **pilot-flags**, **legacy-urls**, **ops-env**.

**Spec 13/14 E2E:** **cert-only** (`release-gate-cert`). Il PR gate esegue `smoke:playwright` con `testIgnore` su spec 13 e 14 ([`e2e/playwright.config.ts`](../e2e/playwright.config.ts)).

### Regression tiers

| Script | Uso | Count |
|--------|-----|-------|
| `smoke:regression:core` | PR gate blocking | 278 |
| `smoke:regression:extended` | Cert / nightly | ~210 |
| `smoke:regression` | Core + extended (locale) | ~488 |

**P0 partition (Control Plane):** 79 test — **non equivalente** a CORE; riconciliato via contratto.

**Non eseguiti su Vercel:** tutti i gate sopra — build Vercel = `next build` only.

## Workflow `release-gate-cert` (tier 2)

- `smoke:regression:extended`
- `ci:supabase:publication:full`
- `ops:long-session-soak:threshold`
- `smoke:playwright:cert`, `smoke:playwright:scheda-smoke`, `smoke:playwright:ricambio:*`
- `smoke:cleanup:apply`

## Workflow `release-gate-nightly` (tier 3)

- `npm run lint` (advisory), `smoke:regression` full — **non blocking**

## Locale (advisory only)

```bash
npm run control:local    # preferito — Control Plane PR tier
```

```bash
npm run release:gate     # DEPRECATED — NOT merge authority
```

## Branch protection (obbligatoria)

Settings → Branches → `main`: require check **`release-gate`**.

## Vercel

Production attende check `release-gate` sullo SHA deployato. Nessun gate script su Vercel.

## Release baseline (2026-08-30)

- **Pending candidate:** [`docs/release-baseline-candidates/2026-08-30/`](./release-baseline-candidates/2026-08-30/) — `status=CANDIDATE`, `releaseReady=false`, `certificationStatus=NOT_CERTIFIED`
- **Current official release baseline:** unchanged — historical [`docs/audit/release-gate-baseline-2026-08-29.json`](./audit/release-gate-baseline-2026-08-29.json) until CI promotes candidate to `docs/release-baseline/2026-08-30/`
- Transition: [`docs/audit/release-baseline-transition-2026-08-30.md`](./audit/release-baseline-transition-2026-08-30.md)
