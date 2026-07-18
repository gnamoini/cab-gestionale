# Tooltip Primitive Generators Audit

> Generato: 2026-07-18

Componenti che **generano** tooltip downstream. Fix qui = massimo ROI.

| Componente | Path | Props tooltip | Caller stimati |
| ---------- | ---- | ------------- | -------------- |
| IconActionButton | `components/design-system/icon-action-button.tsx` | label, tooltipContent | 53 |
| IconButton | `components/design-system/icon-button.tsx` | label, title | 0 |
| ShellNavIconButton | `components/design-system/shell-nav-icon-button.tsx` | label, tooltipContent | 0 |
| CloseButton | `components/design-system/close-button.tsx` | label, title | 16 |
| ToolbarGroup | `components/design-system/toolbar-group.tsx` | tooltip, label | 4 |
| PageToolbar | `components/design-system/page-toolbar.tsx` | title, label | 9 |
| GestionaleRefreshToolbarButton | `components/gestionale/page-header-toolbar.tsx` | label, tip | 1 |
| PageActionMenu | `components/ui/page-action-menu/PageActionMenu.tsx` | tooltip | 12 |
| PageActionMenuItem | `components/ui/page-action-menu/PageActionMenuItem.tsx` | tooltip, label | 1 |
| DisabledElementTooltip | `components/design-system/disabled-element-tooltip.tsx` | content | 5 |
| TruncatedTextTooltip | `components/design-system/truncated-text-tooltip.tsx` | text | 16 |
| OptionalTooltip | `components/design-system/optional-tooltip.tsx` | content | 32 |
| Tooltip | `components/design-system/tooltip.tsx` | content | 127 |
| GlobalTableSortTh | `components/gestionale/global-table/global-table-header.tsx` | title, label | 85 |

## Priorità refactor

1. IconActionButton, ShellNavIconButton, page-header-toolbar
2. PageActionMenuItem, toolbar-group, close-button
3. OptionalTooltip callers con content duplicato
