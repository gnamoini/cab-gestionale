"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseButton } from "@/components/design-system/close-button";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  dsBtnDanger,
  dsBtnNeutral,
  dsModalCloseBtn,
  dsZModalHigh,
} from "@/lib/ui/design-system";
import {
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  gestionaleModalScrollBodyMobileClass,
} from "@/lib/ui/mobile-modal-behavior";
import { cabModalScrollKeyboardPad } from "@/lib/ui/ios-mobile-tokens";
import { gestionaleModalWidthConfirmation } from "@/lib/ui/modal-max-width-class";
import { useGestionaleOverlayBehavior } from "@/lib/ui/use-gestionale-overlay-behavior";

/** Layout azioni conferma — mobile: Annulla sotto, desktop: Annulla | Conferma a destra. */
export const gestionaleConfirmActionsClass =
  "flex min-w-0 shrink-0 flex-col-reverse gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5";

export function GestionaleConfirmDialog({
  open,
  title,
  subtitle,
  message,
  children,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  destructive = false,
  pending = false,
  confirmDisabled = false,
  layerClassName,
  footer,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  message?: ReactNode;
  /** Corpo aggiuntivo (ha priorità su `message` se entrambi presenti). */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  confirmDisabled?: boolean;
  /** Es. `z-[120]` per dialoghi sopra modali gestionale. */
  layerClassName?: string;
  /** Footer custom (es. due azioni non standard); se impostato, ignora `onConfirm` default. */
  footer?: ReactNode;
  onCancel: () => void;
  onConfirm?: () => void;
}) {
  const dialogRef = useGestionaleOverlayBehavior({
    open,
    onRequestClose: onCancel,
    source: "GestionaleConfirmDialog",
  });

  useEffect(() => {
    if (!open || pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const confirmClass = destructive ? dsBtnDanger : erpBtnAccent;
  const body = children ?? (message ? (
    <p className="text-sm leading-relaxed text-[color:var(--cab-text-muted)]">{message}</p>
  ) : null);

  const defaultFooter = (
    <div className={gestionaleConfirmActionsClass}>
      <button
        type="button"
        className={`${dsBtnNeutral} min-h-[2.75rem] sm:min-h-0`}
        onClick={onCancel}
        disabled={pending}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        className={`${confirmClass} min-h-[2.75rem] sm:min-h-0`}
        onClick={onConfirm}
        disabled={pending || confirmDisabled}
      >
        {pending ? "Attendere…" : confirmLabel}
      </button>
    </div>
  );

  return createPortal(
    <div
      className={`fixed inset-0 flex min-w-0 items-center justify-center overflow-x-hidden bg-[var(--cab-overlay)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[2px] ${layerClassName ?? dsZModalHigh}`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gestionale-confirm-title"
        {...{ [CAB_MODAL_ROOT_ATTR]: "" }}
        className={`flex max-h-[min(92dvh,calc(var(--cab-vv-height,100dvh)-2rem))] w-full ${gestionaleModalWidthConfirmation} flex-col overflow-hidden rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--cab-border)] px-4 py-3">
          <div className="min-w-0">
            <h2 id="gestionale-confirm-title" className="truncate text-base font-semibold text-[color:var(--cab-text)]">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 truncate text-sm text-[color:var(--cab-text-muted)]">{subtitle}</p> : null}
          </div>
          <CloseButton onClick={onCancel} disabled={pending} className={dsModalCloseBtn} label="Chiudi" />
        </header>
        <div
          {...{ [CAB_MODAL_SCROLL_ATTR]: "" }}
          className={`min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5 ${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad}`}
        >
          {body}
        </div>
        <footer className="shrink-0 border-t border-[color:var(--cab-border)] bg-[var(--cab-card)]">
          {footer ?? defaultFooter}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
