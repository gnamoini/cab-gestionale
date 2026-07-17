# Performance Preventivi v3 — Implementations

**Date:** 2026-07-16

| ID | File | Intervento |
|----|------|------------|
| A1 | `app/(gestionale)/preventivi/page.tsx` | `prefetchCriticalPage` + `Suspense` + `PreventiviDeferredHydration` + `includeOrdini` da `?prevTab=ordini` |
| A1 | `components/preventivi/preventivi-deferred-hydration.tsx` | RSC deferred prefetch boundary |
| A2 | `lib/bff/preventivi-page-fetch-server.ts` | BFF `fetchPreventiviPageDTOServer(includeOrdini)` |
| A2 | `lib/preventivi/preventivi-fetch-server.ts` | `fetchPreventiviBillingStatusServer` |
| A2 | `src/lib/react-query/prefetch-gestionale-page.ts` | critical settings + deferred BFF seed billing/ordini condizionale |
| B1 | `src/hooks/gestionale/use-preventivi-records-query.ts` | `useSharedEntityQuery` + `ownershipScopeKey: preventivi.list` |
| B2 | `src/hooks/gestionale/use-preventivi-billing-query.ts` | `preventiviBillingQueryKey` + hydration skip |
| B2 | `lib/render/query-key-factory.ts` | `preventiviBillingQueryKey()` |
| C1 | `components/preventivi/preventivi-view.tsx` | `dynamic()` `OrdiniFornitoriView` + client prefetch tab ordini |
| C2 | `components/preventivi/preventivi-view.tsx` | `dynamic()` filtri + gate `filtriEspansi` |
| C3 | `components/preventivi/preventivi-view.tsx` | editor modal mount-gate |
| C4 | `components/preventivi/preventivi-log-drawer.tsx` | Log drawer estratto + lazy |
| C5 | `components/preventivi/preventivi-view.tsx` | `dynamic()` DDT drawer mount-gate |
| D1 | `components/preventivi/preventivi-view.tsx` | Tab/cross-domain query gates |
| D2 | `lib/preventivi/use-preventivi-list-derived.ts` | Catalogo filtri + search haystack |
| D3 | `lib/ordini-fornitori/use-ordini-fornitori-list-derived.ts` | Haystack ricerca ordini single-pass |
| D3 | `components/ordini-fornitori/ordini-fornitori-view.tsx` | Consumer derived ordini |
| D4 | `components/ordini-fornitori/ordine-fornitore-editor-modal.tsx` | Gate `useMagazzinoRicambiUIQuery` se non view |
| — | `lib/regression/preventivi-perf-policy.test.ts` | Policy regression |
| — | `lib/regression/waterfall-roi-audit.test.ts` | Aggiornato assert BFF |

## Fuori scope (residuo)

- Full-list fetch server-side (no RPC paginazione)
- Ordini list payload con tutte le `righe[]`
- Monolite `preventivi-view.tsx` (~1.4k LOC)
- Split table island (E1 opzionale)
