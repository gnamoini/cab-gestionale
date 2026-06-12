# Cache Strategy Map

Classificazione multi-layer post DTO Light/Detail/Report. SSOT policy: [`lib/react-query/data-cache-tiers.ts`](../lib/react-query/data-cache-tiers.ts).

## Tier summary

| Tier | staleTime | gcTime | refetchOnWindowFocus | Invalidation |
|------|-----------|--------|----------------------|--------------|
| **STATIC** | Infinity | 24h | false | Settings mutation, realtime `app_settings`, `invalidateRuntimeTruth` |
| **SEMI** | 15 min | 1h | false | Domain CRUD (mezzi, magazzino), targeted QK invalidation |
| **DYNAMIC** | 30s CORE / 60–120s VIEW | 300s–600s | CORE realtime-aware | Realtime bridge, operational truth |

## Cache map by dataset

| Dataset | Tier | Where cached | Notes |
|---------|------|--------------|-------|
| `app_settings` payload | STATIC | React Query + sessionStorage fingerprint | Shared `AppSettingsQueryProvider` |
| Current-user `user_permissions` | STATIC | React Query Infinity | Existing |
| Global options (categorie, stati, addetti) | STATIC | Derived from settings | `useGlobalOptions` |
| Branding API | STATIC | Edge `s-maxage` + browser | Public routes only |
| `mezzi` list (`variant: list`) | SEMI | React Query | LIGHT columns |
| `magazzino` list (`variant: list`) | SEMI | React Query | Page densa invariata |
| Profile names batch | SEMI | React Query 120s | Mobile lazy |
| `lavorazioni` attive | DYNAMIC | React Query 30s | **Never** Infinity stale |
| Report live slice | DYNAMIC | React Query 120s | No embed mezzo |
| Log feeds | DYNAMIC | React Query VIEW | Limit 200 |
| Schede bundles | DYNAMIC | React Query | Surgical patch preferred |

## Server-side (narrow)

| Function | Strategy |
|----------|----------|
| `getServerSession` | React `cache()` per request |
| Auth snapshot Map | 45s in-process |
| `fetchOperatorGlobalSettingsDbEnabledServer` | React `cache()` per request |
| Gestionale lists (mezzi, lav) | **Not server-cached** — RLS + session |

## Hard rules (never cache aggressively)

- Lavorazioni attive / report live rows with Infinity staleTime
- Cross-user permission matrices without invalidation
- PostgREST gestionale data at Vercel edge (user-specific RLS)
- Derived join results without TTL

Consistency > performance.
