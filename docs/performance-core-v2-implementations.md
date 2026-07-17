# Performance Core v2 — Implementations

**Date:** 2026-07-16  
**Scope:** Waves 4 (rest), 5, 6

## Wave 4 — Bundle, CSS, lazy loading

| Change | Files | Benefit |
|--------|-------|---------|
| Confirm dialog lazy SSOT | `gestionale-confirm-dialog-styles.ts`, `use-gestionale-confirm.tsx` → `GestionaleConfirmDialogLazy` | Hook non carica chunk confirm fino al primo uso |
| CSS split core vs shell | `globals-core.css`, `globals-gestionale-shell.css`, `layout.tsx`, `(gestionale)/layout.tsx` | Login/offline −~15 KB CSS shell/sidebar |
| Table CSS scoped | `gestionale-list-table.css` via `gestionale-list-table-shell.tsx` only (unchanged chain) | Pagine non-lista non pagano table rules |
| Loading skeletons RSC | `components/design-system/loading/*` — rimosso `"use client"` da markup statico | `loading.tsx` route senza boundary client extra |
| GlobalTableSortIcon server | `global-table-sort-icon.tsx` — SVG puro, no `"use client"` | Meno client boundary in header tabella |

## Wave 5 — React Query, fetch, PWA

| Change | Files | Benefit |
|--------|-------|---------|
| AbortSignal in useServiceQuery | `use-service-query.ts` | Cancel fetch stale su navigazione rapida |
| PWA reconnect wiring | `query-provider.tsx`, `pwa-query-policy.ts` (`pwaQueryGroupMeta`) | Refetch on reconnect rispetta gruppo PWA |
| useGestionaleQueryOpts SSOT | `use-gestionale-query-opts.ts` → `GESTIONALE_CORE_STALE_MS` | Nessun literal `30_000` duplicato |
| GlobalLoading meta filter | `global-loading-query-bridge.tsx` | Scan cache solo query/mutation con `meta.globalLoading` |
| Auth retry SSOT | `auth-network-retry.ts` → `getUserWithAuthRetry` | Server + client unificati |

## Wave 6 — Streaming prefetch, GPU, docs

| Change | Files | Benefit |
|--------|-------|---------|
| prefetchCritical / prefetchDeferred API | `prefetch-gestionale-page.ts` | Pagine RSC possono `await critical` + stream deferred |
| GPU table tokens | `gestionale-list-table.css` — `translateZ(0)`, `prefers-reduced-transparency` su sticky shadow | Meno paint cost su scroll liste |
| Confirm motion-safe blur | `gestionale-confirm-dialog.tsx` → `motion-safe:backdrop-blur` | Coerente con token iOS |

## Verification

```bash
npm run build
npx tsx lib/regression/performance-policy.test.ts
npx tsx lib/regression/list-layout-ssot-audit.test.ts
npx tsx src/lib/auth/auth-network-retry.test.ts
```
