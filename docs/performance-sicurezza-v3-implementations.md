# Sicurezza Performance v3 — Implementations

**Date:** 2026-07-17

## Wave A — SSR streamabile

- `app/(gestionale)/sicurezza/page.tsx`: critical/deferred split
- `components/gestionale/sicurezza/sicurezza-deferred-hydration.tsx`
- `lib/bff/sicurezza-page-fetch-server.ts` + `lib/security/security-users-permissions-fetch-server.ts`
- `src/lib/react-query/prefetch-gestionale-page.ts`: settings/users in deferred

## Wave B — Query ownership

- `lib/render/query-ownership-registry.ts`: `security.usersPermissions`
- `src/hooks/use-sicurezza-users-permissions-query.ts`
- `security-dashboard-view.tsx`: consumer wrapper

## Wave C — Bundle gates

- `components/dashboard/security/security-tab-loaders.tsx`
- Lazy tab panels + modali in dashboard, users panel, table, roles panel

## Wave D — Tab query gating

- `lib/security/prefetch-sicurezza-tab-queries.ts`
- Release check gated; `useGlobalOptions` in monitoring section
- Users query gated per tab users/monitoring

## Wave E — Budget

- `lib/performance/performance-budget-registry.ts`: entry `/sicurezza`

## Invariato

- RBAC layout `verifyServerPageWrite("sicurezza")`
- Server actions save/batch
- `prefetchSicurezzaPage()` per compat/test
