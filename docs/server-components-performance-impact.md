# Server Components — performance impact (indicative)

## Pattern

Server prefetch eliminates the browser→Supabase round-trip for the first paint of list READ paths. React Query hooks read hydrated cache; `refetchOnMount: false` / tier `staleTime` avoids duplicate fetch when data is fresh.

## Expected deltas (M1–M6)

| Route | Client fetch calls saved (cold) | Notes |
|-------|----------------------------------|-------|
| `/dashboard` | −2 (lav attive + mag report) | Log feeds still client |
| `/mezzi` | −1 (mezzi list) | Lavorazioni scoped join deferred |
| `/lavorazioni` | −1 (lav attive) | Chiuse/kanban/schede client |
| `/magazzino` | −2 (list + settings) | Mutations/logs client |
| `/report` | −5 to −6 (4 report queries + manual entries + settings) | Period prefs still client |
| `/impostazioni` | −1 (settings payload) | Mutations client |

## Metrics to track

| Metric | Tool |
|--------|------|
| Client query fetch count | `window.__cabQueryFetchAudit()` (`lib/observability/query-fetch-counter.ts`) |
| TTFB | Vercel / browser Network |
| Time-to-interactive data | Performance mark on view ready |

## TTFB trade-off

Server fetch adds work on the Node request path (auth + Supabase). Net UX win when client RTT to Supabase is slower than server→Supabase (typical). Monitor p95 TTFB after rollout.

## Not in scope

- Server pagination for large tables
- Chiuse lazy, schede bundles, profile batch
- Realtime-driven invalidation (unchanged)
