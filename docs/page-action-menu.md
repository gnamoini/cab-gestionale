# PageActionMenu — SSOT overflow header

Riferimento: [ADR-003](../adr/ADR-003-page-action-menu.md)

## Uso

```tsx
import { PageActionMenu, pageActionCreateItem, pageActionFiltersItem } from "@/components/ui";

<PageHeader
  title="Mezzi"
  actions={
    <PageActionMenu
      items={[
        pageActionCreateItem({ label: "Nuovo mezzo", onSelect: openModal, module: "mezzi" }),
        pageActionFiltersItem({ expanded, active, onToggle }),
      ]}
      onRefresh={() => refetch()}
      filtersActive={active}
      showFiltersActiveDot
    />
  }
/>
```

## Provider + hook (pagine complesse)

```tsx
<PageActionMenuProvider onRefresh={...} filtersActive={...}>
  <MyPageMenuRegistrar />
  <PageHeader actions={<PageActionMenu />} />
</PageActionMenuProvider>

function MyPageMenuRegistrar() {
  usePageActionMenu(items, { group: "primary", deps: [canWrite] });
  return null;
}
```

## Eccezioni

- **Search + meta** restano in `PageToolbar` slim
- **Dirty save** (Impostazioni): `GestionaleDirtySaveActions` inline accanto a `⋮` quando `isDirty`

## Accessibilità

- Trigger: `aria-haspopup="menu"`, shortcut `Alt+A`
- Desktop: popup ancorato bottom-end, keyboard ↑↓
- Mobile: `GestionaleMobileBottomSheet`

## Import

Solo da `@/components/ui` — enforcement BLOCKER su menu portal custom.
