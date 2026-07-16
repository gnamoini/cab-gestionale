import { createElement } from "react";
import type { PageActionItem } from "@/components/ui/page-action-menu/page-action-menu-types";
import {
  PageActionIconLog,
  PageActionIconRefresh,
  PageActionIconUndo,
} from "@/components/ui/page-action-menu/page-action-menu-icons";

export function clickPageActionHiddenTrigger(container: HTMLElement | null | undefined): void {
  container?.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

export function pageActionFiltersItem(opts: {
  expanded: boolean;
  active: boolean;
  onToggle: () => void;
}): PageActionItem {
  return {
    id: "filters",
    label: "Filtri",
    description: opts.active ? "Filtri attivi — tocca per modificare" : "Mostra o nascondi i filtri",
    onSelect: opts.onToggle,
    badge: opts.active ? "•" : undefined,
    toggle: undefined,
    chevron: false,
  };
}

export function pageActionLogItem(onOpenLog: () => void, title = "Log attività"): PageActionItem {
  return {
    id: "log",
    label: title,
    description: "Storico modifiche e attività",
    icon: createElement(PageActionIconLog),
    onSelect: onOpenLog,
  };
}

export function pageActionUndoItem(opts: {
  canUndo: boolean;
  undoDisabled?: boolean;
  undoPending?: boolean;
  onUndo: () => void;
}): PageActionItem {
  const disabled = opts.undoDisabled || !opts.canUndo || opts.undoPending;
  return {
    id: "undo",
    label: "Annulla",
    description: "Annulla l'ultima azione",
    icon: createElement(PageActionIconUndo),
    onSelect: opts.onUndo,
    disabled,
    loading: opts.undoPending,
  };
}

export function pageActionRefreshItem(opts: {
  busy?: boolean;
  label?: string;
  onRefresh: () => void;
}): PageActionItem {
  return {
    id: "refresh-inline",
    label: opts.label ?? "Aggiorna",
    description: "Ricarica i dati della pagina",
    icon: createElement(PageActionIconRefresh),
    onSelect: opts.onRefresh,
    loading: opts.busy,
  };
}

export function pageActionCreateItem(opts: {
  id?: string;
  label: string;
  description?: string;
  shortLabel?: string;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
  shortcut?: string;
  badge?: string | number;
  requireWrite?: boolean;
  module?: PageActionItem["module"];
  pageKey?: PageActionItem["pageKey"];
}): PageActionItem {
  return {
    id: opts.id ?? "create",
    label: opts.label,
    description: opts.description ?? opts.shortLabel,
    onSelect: opts.onSelect,
    disabled: opts.disabled,
    disabledReason: opts.disabledReason,
    shortcut: opts.shortcut,
    badge: opts.badge,
    requireWrite: opts.requireWrite ?? true,
    module: opts.module,
    pageKey: opts.pageKey,
  };
}
