# Dashboard boot — baseline metrics

Riferimento misurato il 2026-06-30 (post-ottimizzazione). Rigenerare con `ANALYZE=true npm run build`.

## Build

| Check | Esito | Dettaglio |
|-------|-------|-----------|
| `npm run build` | **PASS** | ~90s (Turbopack), route `/dashboard` generata |
| TypeScript (`ci:tsc`) | **PASS** | 0 errori |
| Self-check | **PASS** | `dashboard-lite-prefetch`, `dashboard-schede-prefetch-limit`, `dashboard-mag-widget-subset` |

## Bundle statico (`.next/static`, build prod locale)

| Metrica | Valore |
|---------|--------|
| File JS totali | 126 file, **~6.6 MB** raw |
| Cartella `chunks/` | 130 file, **~7.0 MB** raw (include CSS) |
| Chunk singolo max | **~681 KB** |
| Analyzer HTML | non persistito in repo — `@next/bundle-analyzer` apre browser locale con `ANALYZE=true` |

## Query cold load `/dashboard` (post-fix)

| Fase | Round-trip DB (stima) |
|------|------------------------|
| Edge auth | 2–4 |
| RSC auth | 0–2 (cache 45s; **header proxy→RSC** evita refetch se snapshot inoltrato) |
| `app_settings` SSR | **1** (React `cache` SSOT) |
| Dashboard BFF wave 1 | lav + mag + settings + 3 log (parallelo) |
| Dashboard BFF wave 2 | mezzo top-8 + schede top-8 |
| Client profiles | **0** (skip INITIAL_SESSION se snapshot match) |
| Client log | **0** (hydrate SSR) |
| Client schede | **0** su happy path (top-8 allineato SSR/client) |

## Payload idrato (post-fix)

| Dato | Strategia |
|------|-----------|
| Lavorazioni | lista completa senza mezzo embed + enrich top-8 |
| Schede | batch solo top-8 ID priorità |
| Magazzino | **subset** (sotto scorta widget + ricambi citati nei log); KPI precomputati server (`magDashboardKpi`) |
| Log | 3 × limit 100, chiavi unificate |

## Boot investigation

Abilitare boot investigation in dev; metriche: `authRestoreDuration`, `dashboardLoadDuration` (`RuntimeEvents`).

## Fix applicati (2026-06-30)

- R1: `useSchedeBundlesQuery` / feed dashboard limitati a `DASHBOARD_SCHEde_PREFETCH_LIMIT` (8)
- Pill styles estratti in `lib/lavorazioni/lavorazioni-pill-styles.ts` (no leak `global-table` da dashboard cards)
- Mag KPI server-side + dehydrate subset (`buildDashboardMagWidgetFromReportRows`)
- Auth snapshot edge→RSC via header `x-cab-auth-snapshot` (strip client-forged)

## Residui noti

- AppShell ~785 righe ancora eager su ogni route gestionale
- Mag SSR: scan DB completo per KPI meta (payload client ridotto, non query DB)
- Theme prefs fetch post-auth
- Turbopack NFT warning su `production-readiness-scan` (pre-esistente)
