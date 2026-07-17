# Performance Sicurezza v3 — Metrics SSOT

**Date:** 2026-07-17  
**Domain:** `/sicurezza`

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| SSR pattern | blocking `prefetchSicurezzaPage()` |
| Critical prefetch | `getAppSettingsPayloadServer` (blocca TTFB) |
| Deferred hydration | no-op |
| BFF pagina | assente |
| Hook users | `useSecurityUsersPermissionsQuery` senza hydration skip |
| Cold load extra | `runControlCenterCheck` + `useGlobalOptions` nel parent |
| Bundle | 4 tab panels + modali eager |

## After (v3 target)

| Metrica | Valore |
|---------|--------|
| SSR pattern | critical vuoto + Suspense + `SicurezzaDeferredHydration` |
| BFF | `fetchSicurezzaPageDTOServer` (settings + users) |
| Hydration dedup | `security.usersPermissions` + `settings.payload` |
| Tab gating | release check + users query + lazy tab panels |
| Bundle | lazy roles/monitoring/release + modali on demand |
| Policy tests | `sicurezza-perf-policy` |

## Verifica 2026-07-17

| Check | Esito |
|-------|-------|
| `npm run build` | PASS |
| `sicurezza-perf-policy.test.ts` | PASS |
| `waterfall-roi-audit.test.ts` | PASS |
| `performance-policy.test.ts` | PASS |
| `security-page-architecture-policy.test.ts` | PASS |
| `security-rbac-policy.test.ts` | PASS |

## Regenerate

```bash
npm run build
npx tsx lib/regression/sicurezza-perf-policy.test.ts
npx tsx lib/regression/waterfall-roi-audit.test.ts
npx tsx lib/regression/performance-policy.test.ts
```
