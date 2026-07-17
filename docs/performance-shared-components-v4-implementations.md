# Shared Components Performance v4 — Implementations

**Date:** 2026-07-17

## Wave A — Confirm lazy-by-default

- `gestionale-confirm-dialog-impl.tsx` — implementazione
- `gestionale-confirm-dialog.tsx` — `dynamic()` re-export
- `gestionale-confirm-dialog-lazy.tsx` — alias deprecato

## Wave B — global-select split

- `global-select-types.ts` — tipi e helper
- `global-select-listbox-panel.tsx` — classi dropdown SSOT
- `global-select-option-row.tsx` — `memo` riga opzione
- `global-select.tsx` — dynamic sheet select

## Wave C — GlobalTable

- `global-table.tsx` — `memo(VirtualTableBody)`
- `global-table-header.tsx` — `memo(GlobalTableSortTh)`
- `lib/ui/gestionale-list-virtual-rows.ts` — `useGestionaleListVirtualRows`

## Wave D — Tooltip

- `use-tooltip.ts` — `batchedAutoUpdate` rAF
- `tooltip.tsx` — `memo(Tooltip)`

## Wave E — Overlay

- `drawer.tsx` — unmount children on `closing`
- `gestionale-modal-gate.tsx` — SSOT gate pattern

## Wave F — Kanban

- `components/gestionale/kanban/kanban-virtual-column-scroll.tsx`
- `lavorazioni/kanban-virtual-column-scroll.tsx` — re-export

## Wave G — Upload + collapsible

- `gestionale-image-crop-modal-lazy.tsx` + `record-image-manager.tsx`
- `upload-status-inline.tsx` — `memo`
- `gestionale-collapsible-section.tsx` — `unmountOnCollapse` opt-in

## Invariato

- API pubbliche componenti
- UX/UI comportamento default
