"use client";

import type { ReactNode } from "react";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnDanger, dsBtnNeutral } from "@/lib/ui/design-system";

/** Layout azioni conferma — mobile: Annulla sotto, desktop: Annulla | Conferma a destra. */
export const gestionaleConfirmActionsClass =
  "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end";

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
  if (!open) return null;

  const confirmClass = destructive ? dsBtnDanger : erpBtnAccent;
  const body = children ?? (message ? (
    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{message}</p>
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

  return (
    <LavorazioniModalShell
      layerClassName={layerClassName}
      onRequestClose={pending ? () => {} : onCancel}
      title={title}
      subtitle={subtitle}
    >
      <div className="p-4 sm:p-6">
        {body}
        {footer ?? defaultFooter}
      </div>
    </LavorazioniModalShell>
  );
}
