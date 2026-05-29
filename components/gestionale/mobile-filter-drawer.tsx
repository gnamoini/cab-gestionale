"use client";

import { useEffect, type ReactNode } from "react";
import { CloseButton } from "@/components/design-system";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnNeutral, dsBtnPrimary, dsZModalHigh } from "@/lib/ui/design-system";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";

type MobileFilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  onReset?: () => void;
  onApply?: () => void;
  /** Se omesso, il pulsante "Applica" chiude il drawer. */
  applyLabel?: string;
};

export function MobileFilterDrawer({
  open,
  onClose,
  title = "Filtri",
  children,
  onReset,
  onApply,
  applyLabel = "Applica",
}: MobileFilterDrawerProps) {
  useBodyScrollLock(open, "MobileFilterDrawer");

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

  if (!open) return null;

  return (
    <div className={`fixed inset-0 ${dsZModalHigh} touch-none overscroll-none md:hidden`} role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px] touch-manipulation"
        aria-label="Chiudi filtri"
        onClick={onClose}
      />
      <div
        className="cab-drawer-panel absolute inset-y-0 right-0 flex w-[min(100%,22rem)] max-w-[100vw] flex-col border-l border-zinc-200 bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cab-filter-drawer-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 id="cab-filter-drawer-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="gestionale-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">{children}</div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
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
    </div>
  );
}
