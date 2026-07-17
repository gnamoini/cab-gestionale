"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseButton } from "@/components/design-system";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnNeutral, dsBtnPrimary, dsZModalHigh } from "@/lib/ui/design-system";
import {
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  gestionaleModalScrollBodyMobileClass,
} from "@/lib/ui/mobile-modal-behavior";
import { cabModalScrollKeyboardPad } from "@/lib/ui/ios-mobile-tokens";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-max-width-class";
import { useGestionaleOverlayBehavior } from "@/lib/ui/use-gestionale-overlay-behavior";

type MobileFilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  onReset?: () => void;
  onApply?: () => void;
  /** Se omesso, il pulsante "Applica" chiude il drawer. */
  applyLabel?: string;
  /** Chiude il drawer dopo un click su un pulsante nel corpo (es. azioni «Altro» su mobile). */
  closeOnBodyButtonClick?: boolean;
};

export function MobileFilterDrawer({
  open,
  onClose,
  title = "Filtri",
  children,
  onReset,
  onApply,
  applyLabel = "Applica",
  closeOnBodyButtonClick = false,
}: MobileFilterDrawerProps) {
  const panelRef = useGestionaleOverlayBehavior({
    open,
    onRequestClose: onClose,
    source: "MobileFilterDrawer",
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={`fixed inset-0 ${dsZModalHigh} overscroll-none sm:hidden`} role="presentation">
      <button
        type="button"
        className="absolute inset-0 touch-none bg-[var(--cab-overlay)] backdrop-blur-[1px] touch-manipulation"
        aria-label="Chiudi filtri"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`${resolveDrawerAsideClasses("drawerFilter")} touch-auto`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cab-filter-drawer-title"
        {...{ [CAB_MODAL_ROOT_ATTR]: "" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--cab-border)] px-4 py-3">
          <h2 id="cab-filter-drawer-title" className="text-sm font-semibold text-[color:var(--cab-text)]">
            {title}
          </h2>
          <CloseButton onClick={onClose} />
        </div>
        <div
          {...{ [CAB_MODAL_SCROLL_ATTR]: "" }}
          className={`gestionale-scrollbar min-h-0 min-w-0 flex-1 touch-pan-y space-y-4 overflow-y-auto overscroll-contain p-4 [&_fieldset>div]:!grid-cols-1 ${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad}`}
          onClick={
            closeOnBodyButtonClick
              ? (e) => {
                  const btn = (e.target as HTMLElement).closest("button");
                  if (!btn || btn.disabled || btn.closest("[data-cab-drawer-footer]")) return;
                  onClose();
                }
              : undefined
          }
        >
          {children}
        </div>
        <div
          data-cab-drawer-footer
          className="flex min-w-0 shrink-0 flex-col gap-2 border-t border-[color:var(--cab-border)] p-4"
        >
          {onReset ? (
            <button type="button" onClick={onReset} className={`${dsBtnNeutral} min-h-11 w-full justify-center`}>
              Reimposta
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onApply?.();
              onClose();
            }}
            className={`${dsBtnPrimary} min-h-11 w-full justify-center ${erpFocus}`}
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
