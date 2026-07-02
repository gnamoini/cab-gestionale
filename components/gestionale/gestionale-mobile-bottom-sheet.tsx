"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { armSelectorGhostClickGuard } from "@/lib/selector-interaction/suppress-selector-ghost-click";
import { CloseButton } from "@/components/design-system";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import {
  CAB_MODAL_ROOT_ATTR,
  CAB_STICKY_HEADER_ATTR,
  cabModalZStacked,
} from "@/lib/ui/mobile-modal-behavior";

/** Layer ancorato al visual viewport (tastiera virtuale iOS/Android). */
const sheetLayerClass =
  "fixed inset-x-0 top-[var(--cab-vv-offset-top,0px)] flex h-[var(--cab-vv-height,100dvh)] max-h-[var(--cab-vv-height,100dvh)] touch-none flex-col justify-end overflow-hidden overscroll-none";

const sheetBackdropClass =
  "absolute inset-0 bg-[var(--cab-overlay)] backdrop-blur-[1px] touch-manipulation";

const sheetPanelClass =
  "relative z-[1] flex w-full max-h-[min(92%,100%)] min-h-0 touch-auto flex-col overflow-hidden rounded-t-[var(--ds-radius-xl)] border border-b-0 border-[color:var(--cab-border)] bg-[var(--cab-card)] pb-[env(safe-area-inset-bottom)] shadow-[var(--cab-shadow-lg)] animate-[gestionale-sheet-in_280ms_cubic-bezier(0.22,1,0.36,1)]";

function shouldSkipSheetEscape(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return true;
  return false;
}

export function GestionaleMobileBottomSheet({
  open,
  onRequestClose,
  title,
  titleId,
  children,
  header,
  footer,
  backdropLabel = "Chiudi",
  layerClassName,
  panelRef,
  className = "",
  closeOnEscape = true,
  restoreFocusRef,
}: {
  open: boolean;
  onRequestClose: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
  /** Contenuto sotto l'header titolo (es. campo ricerca). */
  header?: ReactNode;
  footer?: ReactNode;
  backdropLabel?: string;
  layerClassName?: string;
  panelRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  closeOnEscape?: boolean;
  restoreFocusRef?: RefObject<HTMLElement | null>;
}) {
  const prevOpenRef = useRef(open);
  const innerPanelRef = useRef<HTMLDivElement | null>(null);

  function assignPanelRef(node: HTMLDivElement | null) {
    innerPanelRef.current = node;
    if (panelRef) panelRef.current = node;
  }
  const { restoreFocus } = useDropdownFocusRestore(open);

  useEffect(() => {
    if (prevOpenRef.current && !open) {
      armSelectorGhostClickGuard();
      restoreFocus();
      restoreFocusRef?.current?.focus({ preventScroll: true });
    }
    prevOpenRef.current = open;
  }, [open, restoreFocus, restoreFocusRef]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (shouldSkipSheetEscape(e.target)) return;
      armSelectorGhostClickGuard();
      onRequestClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeOnEscape, onRequestClose]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      const root = panelRef?.current ?? innerPanelRef.current;
      const btn = root?.querySelector('button[aria-label="Chiudi"]');
      if (btn instanceof HTMLButtonElement) btn.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, panelRef]);

  const requestClose = () => {
    armSelectorGhostClickGuard();
    onRequestClose();
  };

  if (!open || typeof document === "undefined") return null;

  const sheet = (
    <div
      className={`${sheetLayerClass} ${layerClassName ?? cabModalZStacked} ${className}`.trim()}
      role="presentation"
    >
      <button
        type="button"
        className={sheetBackdropClass}
        aria-label={backdropLabel}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          requestClose();
        }}
      />
      <div
        ref={assignPanelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={sheetPanelClass}
        {...{ [CAB_MODAL_ROOT_ATTR]: "" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative z-[1] shrink-0 bg-[var(--cab-card)]" {...{ [CAB_STICKY_HEADER_ATTR]: "" }}>
          <div className="flex items-center justify-between gap-2 border-b border-[color:var(--cab-border)] px-4 py-3">
            <h2 id={titleId} className="min-w-0 truncate text-sm font-semibold text-[color:var(--cab-text)]">
              {title}
            </h2>
            <CloseButton onClick={requestClose} aria-label="Chiudi" />
          </div>
          {header ? <div className="border-b border-[color:var(--cab-border)]">{header}</div> : null}
        </div>
        {children}
        {footer ? (
          <div className="shrink-0 border-t border-[color:var(--cab-border)] px-3 py-2">{footer}</div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
