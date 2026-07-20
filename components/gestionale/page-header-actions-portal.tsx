"use client";

import { useCallback, useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PageActionMenu, type PageActionMenuProps } from "@/components/ui";

export const PAGE_HEADER_ACTIONS_SLOT_ID = "gestionale-page-header-actions-slot";

function resolvePageHeaderActionsSlot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(PAGE_HEADER_ACTIONS_SLOT_ID);
}

function usePageHeaderActionsSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  const bindSlot = useCallback(() => {
    const el = resolvePageHeaderActionsSlot();
    if (el) setSlot(el);
    return el;
  }, []);

  useLayoutEffect(() => {
    const immediate = bindSlot();
    if (immediate) return;

    const observer = new MutationObserver(() => {
      const el = bindSlot();
      if (el) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [bindSlot]);

  return slot;
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
