"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type CollapsibleAccordionContextValue = {
  openId: string | null;
  toggle: (id: string) => void;
  isOpen: (id: string) => boolean;
};

const CollapsibleAccordionContext = createContext<CollapsibleAccordionContextValue | null>(null);

/** Una sola sezione aperta per gruppo — aprire una chiude le altre. */
export function CollapsibleAccordionProvider({
  children,
  initialOpenId = null,
  onOpenIdChange,
}: {
  children: ReactNode;
  initialOpenId?: string | null;
  onOpenIdChange?: (openId: string | null) => void;
}) {
  const [openId, setOpenIdState] = useState<string | null>(initialOpenId);

  const toggle = useCallback(
    (id: string) => {
      setOpenIdState((prev) => {
        const next = prev === id ? null : id;
        onOpenIdChange?.(next);
        return next;
      });
    },
    [onOpenIdChange],
  );

  const value = useMemo(
    (): CollapsibleAccordionContextValue => ({
      openId,
      toggle,
      isOpen: (id: string) => openId === id,
    }),
    [openId, toggle],
  );

  return <CollapsibleAccordionContext.Provider value={value}>{children}</CollapsibleAccordionContext.Provider>;
}

export function useCollapsibleAccordionOptional() {
  return useContext(CollapsibleAccordionContext);
}
