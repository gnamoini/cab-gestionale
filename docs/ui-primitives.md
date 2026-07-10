# UI Primitives — Tassonomia e Policy

Riferimento tecnico per tooltip, liste, menu e overlay. Governance: [`ui-governance.md`](./ui-governance.md).

## Classificazione

### Feedback

| Primitive | SSOT | Import consumer |
|-----------|------|-----------------|
| Tooltip | `Tooltip`, `TruncatedTextTooltip`, `DisabledElementTooltip` | `@/components/ui` |
| TooltipList / TooltipStatus | experimental → stable post-migrazione | `@/components/ui` |
| Toast | `useGestionaleToast` | hook esistente |
| Badge | `Badge` | `@/components/design-system` |

### Navigation

| Primitive | SSOT |
|-----------|------|
| Select / Dropdown | `GlobalSelect`, `GlobalMultiSelect` |
| Anchored menu | `GlobalAnchoredMenu` (API frozen) |
| ContextMenu | non implementato — ADR richiesta |

### Collections

| Primitive | SSOT |
|-----------|------|
| Tabelle dense | `GestionaleListTable` + `gestionale-list-table.ts` |
| Settings CRUD | `settings-list-ui.tsx` + `list-primitives.ts` |
| Opzioni dropdown | `global-input.ts` option tokens |

### Overlay

| Tipo | z-index | SSOT |
|------|---------|------|
| Tooltip | 140 | `Tooltip` + `tooltip-portal.ts` |
| Popover | 130 | `AnchoredPopover` (experimental) |
| Dialog | modal stack | `GestionaleModalShell` + `modal-size-system.ts` |
| Drawer | — | `resolveDrawerAsideClasses` |

## Primitive maturity

**Stable** — enforcement BLOCKER su alternative custom:

- Tooltip, TruncatedTextTooltip, DisabledElementTooltip, OptionalTooltip
- GestionaleListTable, GlobalSelect, GestionaleModalShell
- GlobalAnchoredMenu (post-freeze)

**Experimental** — ADR + review; enforcement WARN:

- AnchoredPopover
- TooltipList, TooltipStatus (fino a promozione post-Sprint 1)

**Forbidden** — enforcement BLOCKER:

- custom tooltip (native `title`, CSS `group-hover` opacity, inline portal)
- custom dropdown/menu portal
- import `@/components/design-system/tooltip` fuori allowlist interna

## List Policy — decision tree

```
Hai colonne / sort / paginazione?
  └─ SÌ → GestionaleListTable + gestionale-list-table tokens

Hai record CRUD in Impostazioni?
  └─ SÌ → settings-list-ui + LIST_DIVIDER_UL / LIST_ROW_SHELL

Hai selezione / autocomplete / filtro?
  └─ SÌ → GlobalSelect / GlobalAnchoredMenu + global-input tokens

Nuovo caso non coperto?
  └─ ADR obbligatoria in docs/adr/
```

## Tooltip variants

| Componente | Contratto |
|------------|-----------|
| `Tooltip` | `content: string`, 1–3 parole o multiline |
| `DisabledElementTooltip` | wrap `<span>` su controllo `disabled` |
| `OptionalTooltip` | wrap solo se `content?.trim()` |
| `TooltipList` | `items: string[]` — solo testo/elenco puntato |
| `TooltipStatus` | `lines: {label, value}[]`, max 6 righe (truncate in prod) |

Oltre 6 righe status → Popover o Dialog.

## Token liste (`lib/ui/list-primitives.ts`)

- `LIST_DIVIDER_UL` — `divide-y divide-[color:var(--cab-border)]`
- `LIST_ROW_SHELL` — allineato a `SETTINGS_LIST_ROW`
- `LIST_EMPTY_STATE`, `LIST_LOADING_STATE`, `LIST_ERROR_STATE`

## Component gallery

Catalogo ufficiale: `app/(gestionale)/report/design-system-preview/page.tsx`

Sezioni: tooltip · lists · overlays · states · dark-mode · accessibility

## Audit findings (baseline 2026-07-10)

| Categoria | Blocker | WARN (risolti) | Note |
|-----------|---------|----------------|------|
| Native `title` | 0 | migrati ~125 | AST `migrate-native-title-ast.ts` |
| Direct `@/components/design-system` Tooltip | 0 | 24 file | barrel `@/components/ui` |
| Inline `LIST_DIVIDER_UL` | 0 | 12 file | `list-primitives.ts` |
| Custom portal `role=menu` | 0 | 2 file | `GlobalAnchoredMenu` |
| CSS `group-hover:opacity` | 0 | 3 file | non-tooltip: hover affordance, rimosso pattern |

**Compliance:** `npm run audit:ui` — 0 blockers target. Snapshot: `npm run audit:ui -- --report --write-snapshot`.

**False positive escape hatch:** `// ui-contract-disable` sulla riga (solo casi documentati).

## Enforcement ladder

1. **INFO** — nuovi pattern sospetti
2. **WARN** — ESLint + audit CI (stato attuale)
3. **BLOCKER** — native title, inline portal tooltip, deprecated table tokens
