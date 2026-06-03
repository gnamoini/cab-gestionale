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
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";

/** Layout azioni conferma — mobile: Annulla sotto, desktop: Annulla | Conferma a destra. */
export const gestionaleConfirmActionsClass =
  "mt-5 flex min-w-0 shrink-0 flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end";

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
  useBodyScrollLock(open, "GestionaleConfirmDialog");

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="gestionale-confirm-title"
        className="flex max-h-[min(92dvh,calc(var(--cab-vv-height,100dvh)-2rem))] w-full max-w-md flex-col overflow-hidden rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--cab-border)] px-4 py-3">
          <div className="min-w-0">
            <h2 id="gestionale-confirm-title" className="truncate text-base font-semibold text-[color:var(--cab-text)]">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 truncate text-sm text-[color:var(--cab-text-muted)]">{subtitle}</p> : null}
          </div>
          <CloseButton onClick={onCancel} disabled={pending} className={dsModalCloseBtn} label="Annulla" />
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5">
          {body}
          {footer ?? defaultFooter}
        </div>
      </div>
    </div>,
    document.body,
  );
}
