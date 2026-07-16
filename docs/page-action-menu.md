# PageActionMenu — SSOT overflow header

Riferimento: [ADR-003](../adr/ADR-003-page-action-menu.md)

## Scope

`PageActionMenu` unifica **solo le azioni in alto a destra** del `PageHeader` (Aggiorna, Log, Import/Export, Undo, Stampa, ecc.).

I CTA lista (`+ Nuovo`, acquisizione AI, Carica documento, …), il toggle **Filtri** e gli overflow secondari restano in `PageToolbar`.

## Uso

```tsx
import { PageActionMenu, pageActionLogItem, pageActionUndoItem } from "@/components/ui";
import { PageToolbar, PageToolbarCtaLabel } from "@/components/design-system";

<PageHeader
  title="Mezzi"
  actions={
    <PageActionMenu
      items={[
        { id: "import", label: "Importa", onSelect: openImport, module: "mezzi", requireWrite: true },
        pageActionUndoItem({ canUndo, onUndo }),
        pageActionLogItem(() => setLogOpen(true)),
      ]}
      onRefresh={() => refetch()}
      filtersActive={active}
      showFiltersActiveDot
    />
  }
/>

<PageToolbar
  primaryAction={
    <button type="button" className={dsPageToolbarCtaCompact} onClick={openModal}>
      <PageToolbarCtaLabel short="+ Nuovo" full="+ Nuovo mezzo" />
    </button>
  }
  search={...}
  filtersExpanded={expanded}
  onFiltersToggle={toggle}
  filtersPanel={...}
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

- **Search, CTA, Filtri, meta** restano in `PageToolbar`
- **Dirty save** (Impostazioni): `GestionaleDirtySaveActions` inline accanto a `⋮` quando `isDirty`

## Accessibilità

- Trigger: `aria-haspopup="menu"`, shortcut `Alt+A`
- Desktop: popup ancorato bottom-end, keyboard ↑↓
- Mobile: `GestionaleMobileBottomSheet`

## Import

Solo da `@/components/ui` — enforcement BLOCKER su menu portal custom.
