"use client";

import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { dsBtnDanger, dsBtnNeutral } from "@/lib/ui/design-system";

export function SettingsEliminaConfirmDialog({
  open,
  itemLabel,
  detail,
  onCancel,
  onConfirm,
  pending,
  confirmLabel = "Elimina",
}: {
  open: boolean;
  itemLabel?: string;
  detail?: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
  confirmLabel?: string;
}) {
  if (!open) return null;

  const title = itemLabel ? `Eliminare «${itemLabel}»?` : "Eliminare elemento?";

  return (
    <LavorazioniModalShell onRequestClose={pending ? () => {} : onCancel} title={title}>
      <div className="p-4 sm:p-6">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Sei sicuro di voler eliminare questo elemento?
          {detail ? (
            <>
              <br />
              <span className="mt-2 block text-[color:var(--cab-text-muted)]">{detail}</span>
            </>
          ) : null}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={onCancel} disabled={pending}>
            Annulla
          </button>
          <button type="button" className={dsBtnDanger} onClick={onConfirm} disabled={pending}>
            {pending ? "Eliminazione…" : confirmLabel}
          </button>
        </div>
      </div>
    </LavorazioniModalShell>
  );
}
