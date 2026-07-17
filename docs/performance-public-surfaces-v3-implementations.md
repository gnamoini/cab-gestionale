# Public Surfaces Performance v3 — Implementations

**Date:** 2026-07-17

## Wave A — Bundle gates

- `components/public-surfaces/public-surface-loaders.tsx` — lazy exports per route pubbliche
- Route pages: login, reset-password, not-found (root + gestionale), privacy-policy, offline

## Wave B — Login defer RBAC

- `app/login/login-post-auth-redirect.tsx` — redirect post-auth con hook permessi
- `app/login/login-forgot-password-modal.tsx` — modal lazy on open
- `app/login/login-form.tsx` — niente RBAC hooks al mount anonimo

## Wave C — Exit link leggeri

- `components/gestionale/not-found-view.tsx` — fast-path anonimo `/login`
- `components/gestionale/not-found-authenticated-exit.tsx` — RBAC lazy standalone
- `components/observability/gestionale-error-fallback.tsx` — embedded anonimo senza RBAC

## Wave D — Privacy RSC split

- `components/legal/privacy-policy-body.tsx` — contenuto statico server
- `lib/legal/privacy-policy-tokens.ts` — no import report
- `components/legal/privacy-policy-view.tsx` — chrome client + children

## Wave E — Error + loading

- `app/error.tsx`, `app/(gestionale)/error.tsx` — `GestionaleErrorFallbackLazy`
- `app/privacy-policy/loading.tsx`, `app/offline/loading.tsx`

## Wave F — Budget

- `lib/performance/performance-budget-registry.ts` — `/login`, `/privacy-policy`, `/offline`

## Invariato

- Auth flow, messaggi errore, remember-me, staging guard
- RBAC redirect logic (solo spostata in child post-auth)
- UX/UI pagine pubbliche
