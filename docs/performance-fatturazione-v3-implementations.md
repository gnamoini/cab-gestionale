# Performance Fatturazione v3 — Implementations

**Date:** 2026-07-16

| ID | File | Intervento | Beneficio |
|----|------|------------|-----------|
| A1 | `app/(gestionale)/fatturazione/page.tsx` | `prefetchCriticalPage` + `Suspense` + `FatturazioneDeferredHydration` + tab flags | TTFB shell streamabile |
| A1 | `components/fatturazione/fatturazione-deferred-hydration.tsx` | RSC deferred prefetch boundary | Lista in secondo boundary |
| A2 | `lib/bff/fatturazione-page-fetch-server.ts` | BFF `fetchFatturazionePageDTOServer` | 1 round-trip parallelo lista + tab opzionali |
| A2 | `lib/fatturazione/fatturazione-fetch-server.ts` | `fetchFatturazioneOpenItemsServer` / `fetchFatturazionePaymentsServer` | SSR seed tab secondarie |
| A2 | `lib/fatturazione/fatturazione-open-items-fetch.ts` | Client fetch condiviso open-items | DRY client/server query |
| A2 | `lib/fatturazione/fatturazione-payments-fetch.ts` | Client fetch condiviso payments | DRY client/server query |
| A2 | `src/lib/react-query/prefetch-gestionale-page.ts` | deferred BFF seed lista + open-items/payments condizionale | Hydration dedup |
| B1 | `lib/render/query-ownership-registry.ts` | scope `fatturazione.list/openItems/payments` | Skip refetch client |
| B1 | `lib/render/render-path-orchestrator.ts` | query key mapping fatturazione scopes | Orchestrator allineato |
| B2 | `src/hooks/gestionale/use-invoices-query.ts` | `useSharedEntityQuery` + `fatturazione.list` | Dedup hydration lista |
| B3 | `src/hooks/gestionale/use-fatturazione-open-items-query.ts` | `useSharedEntityQuery` + `fatturazione.openItems` | Dedup scadenziario |
| B3 | `src/hooks/gestionale/use-fatturazione-payments-query.ts` | nuovo hook + `fatturazione.payments` | Dedup pagamenti |
| B3 | `components/fatturazione/fatturazione-pagamenti-section.tsx` | consumer `useFatturazionePaymentsQuery` | Query centralizzata |
| C1 | `components/fatturazione/fatturazione-view.tsx` | gate `usePreventiviRecordsQuery(wizardOpen)` | −1 query default mount |
| C1 | `components/fatturazione/fatturazione-view.tsx` | gate DDT `enabled: needDdtList` (wizardOpen) | −1 query default mount |
| C1 | `components/fatturazione/fatturazione-view.tsx` | gate log `enabled: logOpen` | −1 query default mount |
| C1 | `components/fatturazione/fatturazione-view.tsx` | client prefetch tab scadenziario/pagamenti | Warm cache al primo switch |
| C1 | `fatturazione-pagamenti-section.tsx` | `useFatturazioneOpenItemsQuery(multiOpen)` | open-items solo per incasso multiplo |
| D1 | `fatturazione-fatture-section.tsx` | `dynamic()` filter panel + `filtriEspansi` gate | Bundle −filter fino a expand |
| D2 | `fatturazione-view.tsx` | `dynamic()` detail drawer/payment/log + mount gates | Bundle −~3.6k LOC drawer |
| D2 | `components/fatturazione/fatturazione-log-drawer.tsx` | log drawer estratto | Lazy load log UI |
| D3 | `fatturazione-view.tsx` | `dynamic()` scadenziario/pagamenti/note_credito | Tab fase-1 code-split |
| D4 | `lib/fatturazione/use-fatturazione-list-derived.ts` | `buildInvoiceListContextMaps` single-pass | CPU filter O(n×m)→O(n+m) |
| D4 | `fatturazione-fatture-section.tsx` | consumer derived hook | Meno scan link per row |
| — | `lib/regression/fatturazione-perf-policy.test.ts` | Policy regression | CI guard |
| — | `lib/regression/waterfall-roi-audit.test.ts` | assert BFF fatturazione | Waterfall guard |

## Fuori scope (residuo)

- Server pagination lista fatture (RPC/API)
- Riduzione payload `InvoiceListPayload` (customers/billing per wizard)
- Refactor interno wizard modal
- Report/control-tower `useInvoicesQuery` (altro dominio)
- Core condiviso (shell, auth, `GestionaleListTable`)
