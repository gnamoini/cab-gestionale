# Performance Lavorazioni + Portale clienti v3 — Implementations

**Date:** 2026-07-16

## Lavorazioni staff (`/lavorazioni`)

| ID | File | Intervento |
|----|------|------------|
| A1 | `lavorazioni-view.tsx` | `listIncludeMezzo` gated; enrich mezzi client-side con RPC |
| A1 | `lavorazioni-prefetch-filters.ts` | `LAVORAZIONI_ATTIVE_RPC_FILTERS` + `lavorazioniAttiveListFilters()` |
| A1 | `lavorazioni-list-fetch-server.ts` | SSR attive allineato a RPC filters |
| A1 | `render-path-orchestrator.ts` | query key attive con RPC filters |
| A2 | `lavorazioni-page-fetch-server.ts` | `mezzi.list` in parallelo alla lista |
| A2 | `prefetch-gestionale-page.ts` | seed `mezzi.list` nel deferred lavorazioni |
| A3 | `lavorazioni-view.tsx` | `dynamic()` completamento + concurrency dialog |

## Portale clienti (`/lavorazioni-clienti`)

| ID | File | Intervento |
|----|------|------------|
| B1 | `client-portal-page-fetch-server.ts` | BFF L0 parallelo + schede inCorso |
| B1 | `client-portal-deferred-hydration.tsx` | deferred hydration RSC |
| B1 | `page.tsx` | critical + Suspense + deferred |
| B1 | `prefetch-gestionale-page.ts` | page `lavorazioni_clienti` |
| B1 | `query-ownership-registry.ts` | scope portal inCorso/archivio |
| B2 | `lazy-route-views.tsx`, `[id]/page.tsx` | lazy detail view |
| B3 | `use-client-portal-data-contract.ts` | schede defer archivio |
| B3 | `use-client-portal-page-orchestrator.ts` | `archivioSchedeEnabled` |
| B4 | `client-lavorazioni-view.tsx` | `lsdMode` degraded/paginated UX |
| B5 | `client-lavorazioni-view.tsx` | `useUndoableLog` gated su ingresso |
| B6 | `lazy-route-views.tsx`, `client-lavorazioni-view.tsx` | rimosso dynamic fallback + barrier stack |
| B7 | `client-lavorazione-media-panel.tsx` | IntersectionObserver media below-fold |

## Criticità residue

- Kanban: virtualizzazione colonne non implementata (P2 audit v2).
- Portale >2000 righe: empty state UX; RPC portale fuori scope DB.
- `lavorazioni-view.tsx` resta monolite (~2650 LOC); split islands opzionale A5.

## Policy / build

```bash
npm run build
npx tsx lib/regression/lavorazioni-perf-policy.test.ts
npx tsx lib/regression/client-portal-perf-policy.test.ts
```
