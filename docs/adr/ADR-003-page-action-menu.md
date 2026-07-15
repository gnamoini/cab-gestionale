# ADR-003: PageActionMenu — SSOT overflow header

**Status:** Accepted  
**Date:** 2026-07-15  
**Deciders:** Frontend Platform  
**Primitive version:** 1.0.0

---

## Context

Le azioni pagina sono frammentate tra `PageHeader` (`GestionalePageToolbarActions`) e `PageToolbar` (CTA, Filtri, overflow). Pattern diversi su desktop (inline) e mobile (`MobileFilterDrawer` «Altro»). Nessun contratto unificato per RBAC, badge, submenu, keyboard.

`GlobalAnchoredMenu` è frozen e pensato per dropdown compatti — non copre header fisso, descrizioni, toggle, submenu drill-in.

---

## Decision

Introduciamo **`PageActionMenu`** come nuova primitive governata:

1. **Unico trigger** `⋮` (MoreVertical) in alto a destra del `PageHeader`
2. **Popup ancorato** desktop (`useGlobalDropdownPortal`, bottom-end, 360–420px)
3. **Bottom sheet** mobile (`GestionaleMobileBottomSheet`)
4. **Header fisso** nel panel: Indietro + Aggiorna
5. **API duale**: prop `items` o `PageActionMenuProvider` + `usePageActionMenu`
6. **RBAC centralizzato** in `filterPageActionItems`
7. **Search + meta** restano in `PageToolbar` slim; Filtri controllati da item menu

Eccezione documentata: chip Annulla/Salva inline accanto a `⋮` quando `isDirty` (Impostazioni).

---

## Consequences

- `GestionalePageToolbarActions` deprecato post-migrazione
- `PageToolbar` perde `primaryAction`, `overflowActions`, toggle Filtri inline
- Nuovo export `@/components/ui` — enforcement BLOCKER su menu portal custom
- Bump `UI_PRIMITIVE_VERSIONS.PageActionMenu`

---

## Non-goals

- Context menu right-click
- Toolbar sezione (timesheet, security panels)
- `ShellCard.headerActions`
