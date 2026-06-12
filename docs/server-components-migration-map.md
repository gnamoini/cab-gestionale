# Server Components migration map

Hybrid pattern: **async Server `page.tsx`** prefetches READ data → `dehydrate` → `GestionaleHydrationBoundary` → client `*View` (React Query hooks unchanged).

## SERVER-FIRST (prefetched on cold load)

| Route | Prefetch scope | Module |
|-------|----------------|--------|
| `/dashboard` | Lav attive LIGHT, magazzino report, settings STATIC | `prefetchDashboardPage` |
| `/mezzi` | Mezzi list LIGHT (unfiltered) | `prefetchMezziPage` |
| `/lavorazioni` | Lav attive LIGHT only | `prefetchLavorazioniPage` |
| `/magazzino` | Magazzino list + settings STATIC | `prefetchMagazzinoPage` |
| `/report` | Lav report, mag/mezzi/mov report, manual entries, settings | `prefetchReportPage` |
| `/impostazioni` | Settings payload (admin gate) | `prefetchImpostazioniPage` |

## CLIENT-REQUIRED (no full RSC migration)

- Lavorazioni mutations, kanban (`ssr: false`), schede modals, profile lazy batch
- Lavorazioni chiuse lazy (`enabled: needsChiuseFetch`)
- Realtime bridge (`gestionale-realtime-bridge.tsx`)
- Create/edit forms, optimistic cache, undo log
- Report period prefs (`localStorage`), manual entry mutations
- Client portal (`/lavorazioni-clienti`)
- Dashboard log feeds, promemoria, schede bundles

## Server fetch modules

| Module | Role |
|--------|------|
| `lib/lavorazioni/lavorazioni-list-fetch-server.ts` | Authorized lav list + `cache()` |
| `lib/mezzi/mezzi-list-fetch.ts` + `-server.ts` | Injectable mezzi LIGHT |
| `lib/magazzino/magazzino-list-fetch.ts` + `-server.ts` | Injectable magazzino list |
| `lib/movimenti/movimenti-list-fetch.ts` + `-server.ts` | Report movimenti |
| `lib/app-settings/resolve-settings-for-server.ts` | Sanitize stati server-side |
| `lib/app-settings/app-settings-fetch-server.ts` | Settings dehydrate |
| `src/lib/react-query/prefetch-gestionale-page.ts` | Per-route prefetch + dehydrate |

## Hard rules

1. Server prefetch = **READ only**; mutations stay browser client.
2. React Query keys must match client hooks exactly (`lavorazioniListQueryKey`, `QK.*`).
3. `cache()` per request only — no cross-user list cache.
4. `verifyServerSectionRead` / `verifyServerPermission` before prefetch.
5. LIGHT columns on server READ paths; DETAIL stays client/modal.

## Validation

- `window.__cabQueryFetchAudit()` — zero cold client fetch for prefetched datasets
- `lib/regression/server-fetch-policy.test.ts` — no client imports in server modules
- Mutations + invalidation smoke unchanged
