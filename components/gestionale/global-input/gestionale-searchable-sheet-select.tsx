"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { globalInputFieldDefault } from "@/lib/ui/global-input";
import {
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  CAB_STICKY_HEADER_ATTR,
  gestionaleModalScrollBodyMobileClass,
} from "@/lib/ui/mobile-modal-behavior";
import { cabModalScrollKeyboardPad } from "@/lib/ui/ios-mobile-tokens";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { useGestionaleOverlayBehavior } from "@/lib/ui/use-gestionale-overlay-behavior";
import { GestionaleMobileBottomSheet } from "@/components/gestionale/gestionale-mobile-bottom-sheet";

type LockedScrollStyle = {
  overflow: string;
  overscrollBehavior: string;
  touchAction: string;
};

function lockScrollElement(
  el: HTMLElement,
  saved: Map<HTMLElement, LockedScrollStyle>,
): void {
  if (saved.has(el)) return;
  saved.set(el, {
    overflow: el.style.overflow,
    overscrollBehavior: el.style.overscrollBehavior,
    touchAction: el.style.touchAction,
  });
  el.style.overflow = "hidden";
  el.style.overscrollBehavior = "none";
  el.style.touchAction = "none";
}

function useLockBackgroundScroll(
  active: boolean,
  opts?: {
    exemptScrollRef?: RefObject<HTMLElement | null>;
    exemptPanelRef?: RefObject<HTMLElement | null>;
  },
): void {
  useLayoutEffect(() => {
    if (!active || typeof document === "undefined") return;
    const saved = new Map<HTMLElement, LockedScrollStyle>();

    const isExemptScroll = (el: HTMLElement): boolean => {
      const exempt = opts?.exemptScrollRef?.current;
      return Boolean(exempt && el === exempt);
    };

    const isInsideExemptPanelScroll = (el: HTMLElement): boolean => {
      const panel = opts?.exemptPanelRef?.current;
      if (!panel?.contains(el)) return false;
      return (
        el.hasAttribute(CAB_MODAL_SCROLL_ATTR) ||
        el.classList.contains("gestionale-scrollbar") ||
        el.classList.contains("overflow-y-auto")
      );
    };

    for (const node of document.querySelectorAll(`[${CAB_MODAL_ROOT_ATTR}]`)) {
      if (!(node instanceof HTMLElement)) continue;
      const isExemptPanel = opts?.exemptPanelRef?.current === node;
      if (!isExemptPanel) {
        lockScrollElement(node, saved);
      }
      for (const scrollHost of node.querySelectorAll<HTMLElement>(`[${CAB_MODAL_SCROLL_ATTR}]`)) {
        if (scrollHost === node) continue;
        if (isExemptScroll(scrollHost) || isInsideExemptPanelScroll(scrollHost)) continue;
        lockScrollElement(scrollHost, saved);
      }
    }

    const main = document.querySelector("main.gestionale-scroll-y");
    if (main instanceof HTMLElement && !isExemptScroll(main)) lockScrollElement(main, saved);

    return () => {
      for (const [el, { overflow, overscrollBehavior, touchAction }] of saved) {
        el.style.overflow = overflow;
        el.style.overscrollBehavior = overscrollBehavior;
        el.style.touchAction = touchAction;
      }
    };
  }, [active, opts?.exemptScrollRef, opts?.exemptPanelRef]);
}

function useSheetScrollIsolation(
  open: boolean,
  panelRef: RefObject<HTMLDivElement | null>,
  listScrollRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const allowPanelTouchMove = (target: EventTarget | null): boolean => {
      if (!(target instanceof Node)) return false;
      const panel = panelRef.current;
      if (!panel?.contains(target)) return false;
      if (listScrollRef.current?.contains(target)) return true;
      const header = panel.querySelector(`[${CAB_STICKY_HEADER_ATTR}]`);
      if (header?.contains(target)) return true;
      return false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (allowPanelTouchMove(e.target)) return;
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      if (allowPanelTouchMove(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("wheel", onWheel);
    };
  }, [open, panelRef, listScrollRef]);
}

export type GestionaleSearchableSheetSelectProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  listScrollRef?: RefObject<HTMLDivElement | null>;
  /** Ref input ricerca — per focus chain / query surface derivation. */
  searchInputRef?: RefObject<HTMLInputElement | null>;
  /** ARIA combobox su search input (sheet selectOnly). */
  comboboxAria?: {
    listboxId: string;
    activeDescendantId?: string;
    expanded: boolean;
  };
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSearchFocus?: () => void;
  /** Default true — false per sheet solo elenco (es. addetti). */
  showSearch?: boolean;
};

/**
 * Bottom sheet mobile per selezione da elenco con ricerca dedicata.
 * Overlay back registrato dal parent selector — non qui (dedup).
 */
export function GestionaleSearchableSheetSelect({
  open,
  onOpenChange,
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cerca…",
  searchAriaLabel,
  children,
  footer,
  listScrollRef,
  searchInputRef,
  comboboxAria,
  onSearchKeyDown,
  onSearchFocus,
  showSearch = true,
}: GestionaleSearchableSheetSelectProps) {
  const panelRef = useGestionaleOverlayBehavior({
    open,
    onRequestClose: () => onOpenChange(false),
    source: "GestionaleSearchableSheetSelect",
    registerBack: false,
  });
  const internalListScrollRef = useRef<HTMLDivElement | null>(null);
  const internalSearchRef = useRef<HTMLInputElement>(null);
  const resolvedSearchRef = searchInputRef ?? internalSearchRef;
  const { restoreFocus } = useDropdownFocusRestore(open);
  useLockBackgroundScroll(open, {
    exemptScrollRef: internalListScrollRef,
    exemptPanelRef: panelRef,
  });
  useSheetScrollIsolation(open, panelRef, internalListScrollRef);

  const handleClose = () => {
    onOpenChange(false);
    restoreFocus();
  };

  useEffect(() => {
    if (open) return;
    restoreFocus();
  }, [open, restoreFocus]);

  if (!open) return null;

  return (
    <GestionaleMobileBottomSheet
      open={open}
      onRequestClose={handleClose}
      title={title}
      titleId="cab-searchable-sheet-title"
      panelRef={panelRef}
      backdropLabel="Chiudi selettore"
      className="md:hidden"
      header={
        showSearch ? (
          <div className="px-3 py-2">
            <input
              ref={resolvedSearchRef}
              type="search"
              className={globalInputFieldDefault}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={onSearchKeyDown}
              onFocus={onSearchFocus}
              placeholder={searchPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
              aria-label={searchAriaLabel ?? `Cerca in ${title}`}
              role={comboboxAria ? "combobox" : undefined}
              aria-expanded={comboboxAria?.expanded}
              aria-controls={comboboxAria?.listboxId}
              aria-activedescendant={comboboxAria?.activeDescendantId}
              aria-autocomplete="list"
            />
          </div>
        ) : undefined
      }
      footer={footer}
    >
      <div
        ref={(node) => {
          internalListScrollRef.current = node;
          if (listScrollRef) listScrollRef.current = node;
        }}
        {...{ [CAB_MODAL_SCROLL_ATTR]: "" }}
        className={`gestionale-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1 [-webkit-overflow-scrolling:touch] ${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad}`}
      >
        {children}
      </div>
    </GestionaleMobileBottomSheet>
  );
}
