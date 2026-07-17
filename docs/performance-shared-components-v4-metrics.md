# Performance Shared Components v4 — Metrics SSOT

**Date:** 2026-07-17  
**Scope:** design-system, global-table, global-input, modal/drawer/confirm, tooltip, kanban, upload

## Before (v4 start)

| Area | Stato |
|------|-------|
| Confirm dialog | ~29 import eager `GestionaleConfirmDialog` |
| global-select | Monolite ~1453 LOC |
| GlobalTable virtual body | No `memo` |
| Virtual rows helper | Assente |
| Kanban column scroll | `useLayoutEffect` ogni render |
| Tooltip position | `autoUpdate` diretto |
| Drawer close | Children montati durante animazione |
| Image crop modal | Eager in `record-image-manager` |

## After (v4 target)

| Area | Stato |
|------|-------|
| Confirm dialog | Lazy default export |
| global-select | Split types + listbox panel + dynamic sheet |
| GlobalTable | `memo(VirtualTableBody)` + helper hook |
| Kanban | Event-driven scroll + path shared |
| Tooltip | rAF-batched `autoUpdate` |
| Drawer | Body unmount on close animation |
| Crop modal | Dynamic import |

## Verifica (2026-07-17) — PASS

- `npm run build` — PASS
- `shared-components-perf-policy.test.ts` — PASS
- `performance-policy.test.ts` — PASS
- `design-system-lock-policy.test.ts` — PASS
- `modal-width-audit.test.ts` — PASS
- `loading-design-system.test.ts` — PASS
- `selector-scroll-restoration-audit.test.ts` — PASS
- `mobile-focus-ssot-audit.test.ts` — PASS

Implementazioni: `docs/performance-shared-components-v4-implementations.md`
