# Performance Public Surfaces v3 — Metrics SSOT

**Date:** 2026-07-17  
**Domain:** `/login`, `/login/reset-password`, `/privacy-policy`, `/offline`, not-found, error boundaries

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| Login bundle | `LoginForm` eager (~493 LOC) + RBAC hooks al mount anonimo |
| Login RBAC hooks (anonimo) | `useEffectivePermissionsSource`, `useClientLavorazioniAccess` |
| Forgot-password modal | inline nel bundle login |
| Route pages | import eager client views |
| Privacy policy client | view + ~368 LOC `privacy-policy-content` + import report tokens |
| Standalone 404 CTA | `useSafeGestionaleHomeLink` → stall RBAC fuori shell |
| Error embedded CTA | RBAC anche per sessione anonima |
| Budget registry public routes | 0 |

## After (v3 target)

| Metrica | Valore |
|---------|--------|
| Login bundle | `LoginFormLazy` dynamic; RBAC solo in `LoginPostAuthRedirect` post-auth |
| Login RBAC hooks (anonimo) | 0 |
| Forgot-password modal | lazy on open |
| Route pages | `public-surface-loaders` dynamic |
| Privacy policy client | chrome only; body RSC |
| Standalone 404 CTA | `/login` immediato se anonimo |
| Error embedded CTA | fast-path anonimo |
| Budget registry | `/login`, `/privacy-policy`, `/offline` |

## Verifica 2026-07-17

| Check | Esito |
|-------|-------|
| `npm run build` | PASS |
| `public-surfaces-perf-policy.test.ts` | PASS |
| `loading-page-skeleton-coverage.test.ts` | PASS |
| `loading-manager-policy.test.ts` | PASS |
| `performance-budget-registry.test.ts` | PASS |
| `performance-policy.test.ts` | PASS |

## Regenerate
