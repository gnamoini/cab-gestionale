"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { globalInputDropdownOptionClass, globalInputDropdownPortalPanel } from "@/lib/ui/global-input";
import type { Placement } from "@floating-ui/react-dom";

/** API frozen — estensioni richiedono ADR + bump UI_PRIMITIVE_VERSIONS.GlobalAnchoredMenu */
export type GlobalAnchoredMenuItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
};

export type GlobalAnchoredMenuProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  placement?: Placement;
  matchAnchorWidth?: boolean;
  panelWidth?: number;
  maxHeight?: number;
  listbox?: boolean;
  listId?: string;
  "aria-label"?: string;
};

export type GlobalAnchoredMenuItemsProps = Omit<GlobalAnchoredMenuProps, "children"> & {
  items: GlobalAnchoredMenuItem[];
  onSelect: (item: GlobalAnchoredMenuItem) => void;
};

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
}: GlobalAnchoredMenuProps) {
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
      role="menu"
      aria-label={ariaLabel}
      className={panelClass}
    >
      {children}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(menu, document.body) : null;
}

export function GlobalAnchoredMenuItems({
  items,
  onSelect,
  listbox = false,
  ...rest
}: GlobalAnchoredMenuItemsProps) {
  return (
    <GlobalAnchoredMenu listbox={listbox} {...rest}>
      {items.map((item) => (
        <li key={item.id} role="presentation">
          <button
            type="button"
            role={listbox ? "option" : "menuitem"}
            disabled={item.disabled}
            className={`${globalInputDropdownOptionClass(false)}${
              item.destructive ? " text-[color:var(--cab-danger)]" : ""
            }`}
            onClick={() => {
              if (item.disabled) return;
              onSelect(item);
            }}
          >
            {item.icon ? <span className="mr-2 inline-flex shrink-0">{item.icon}</span> : null}
            {item.label}
          </button>
        </li>
      ))}
    </GlobalAnchoredMenu>
  );
}
