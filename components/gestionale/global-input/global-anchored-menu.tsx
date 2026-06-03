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
 * Con `listbox` (default) il pannello è `<ul role="listbox">` — voci in `<li role="presentation">`.
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
  listbox = true,
  listId,
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
  /** Se true, contenitore `<ul role="listbox">` (pattern dropdown globale). */
  listbox?: boolean;
  listId?: string;
  "aria-label"?: string;
}) {
  const panelRef = useRef<HTMLUListElement | HTMLDivElement>(null);

  const { style, scrollInside, placementOriginClass, floatingRef } = useGlobalDropdownPortal({
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

  const panelClass = `${panelClassName} ${placementOriginClass} ${
    scrollInside ? "overflow-y-auto gestionale-scrollbar" : "overflow-hidden"
  }`;

  const menu = listbox ? (
    <ul
      ref={floatingRef}
      id={listId}
      style={style}
      role="listbox"
      aria-label={ariaLabel}
      className={panelClass}
    >
      {children}
    </ul>
  ) : (
    <div
      ref={floatingRef}
      style={style}
      role="presentation"
      aria-label={ariaLabel}
      className={panelClass}
    >
      {children}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(menu, document.body) : null;
}
