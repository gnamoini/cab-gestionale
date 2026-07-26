"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PageActionMenu, type PageActionMenuProps } from "@/components/ui";

export const PAGE_HEADER_ACTIONS_SLOT_ID = "gestionale-page-header-actions-slot";

function resolvePageHeaderActionsSlot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(PAGE_HEADER_ACTIONS_SLOT_ID);
}

function subscribePageHeaderActionsSlot(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function usePageHeaderActionsSlot(): HTMLElement | null {
  return useSyncExternalStore(
    subscribePageHeaderActionsSlot,
    resolvePageHeaderActionsSlot,
    () => null,
  );
}

/** Target nel PageHeaderTopRow — azioni da view lazy via portal. */
export function PageHeaderActionsSlot() {
  return <div id={PAGE_HEADER_ACTIONS_SLOT_ID} className="contents" />;
}

/** Monta azioni header (es. PageActionMenu) nella riga titolo+hamburger. */
export function PageHeaderActionsPortal({ children }: { children: ReactNode }) {
  const slot = usePageHeaderActionsSlot();
  if (!slot) return null;
  return createPortal(children, slot);
}

/** PageActionMenu nell'header pagina (stessa riga di hamburger + titolo). */
export function PageHeaderPageActionMenu(props: PageActionMenuProps) {
  return (
    <PageHeaderActionsPortal>
      <PageActionMenu {...props} />
    </PageHeaderActionsPortal>
  );
}
