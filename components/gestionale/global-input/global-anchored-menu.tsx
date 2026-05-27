"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { globalInputDropdownPortalPanel } from "@/lib/ui/global-input";
import type { Placement } from "@floating-ui/react-dom";

/**
 * Menu/listbox ancorato al trigger via portal + Floating UI.
 * Per sostituire dropdown `absolute top-full` legacy senza cambiare la logica dati.
 */
export function GlobalAnchoredMenu({
  open,
  anchorRef,
  onClose,
  children,
  panelClassName = globalInputDropdownPortalPanel,
  placement = "bottom-start",
  matchAnchorWidth = true,
  panelWidth,
  maxHeight,
  role = "listbox",
  "aria-label": ariaLabel,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  placement?: Placement;
  matchAnchorWidth?: boolean;
  panelWidth?: number;
  maxHeight?: number;
  role?: string;
  "aria-label"?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  const { style, scrollInside, placementOriginClass } = useGlobalDropdownPortal({
    open,
    anchorRef,
    contentRef: panelRef,
    placement,
    matchAnchorWidth,
    panelWidth,
    maxHeight,
    repositionDeps: [open],
  });

  useDropdownOutsideDismiss(open, anchorRef, panelRef, onClose);

  if (!open || !style) return null;

  const menu = (
    <div
      ref={panelRef}
      style={style}
      role={role}
      aria-label={ariaLabel}
      className={`${panelClassName} ${placementOriginClass} ${
        scrollInside ? "overflow-y-auto" : "overflow-hidden"
      }`}
    >
      {children}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(menu, document.body) : null;
}
