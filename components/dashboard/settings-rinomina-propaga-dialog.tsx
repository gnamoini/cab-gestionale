"use client";

import { Tooltip } from "@/components/ui";
import { GestionaleConfirmDialog, gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";
import type { SettingsRenameEntry } from "@/lib/settings/settings-rename-types";

export function SettingsRinominaPropagaDialog({
  open,
  entries,
  onCancel,
  onConfirm,
  pending,
}: {
  open: boolean;
  entries: SettingsRenameEntry[];
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  if (entries.length === 0) return null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Propagare le modifiche?"
      onCancel={onCancel}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <Tooltip content={"Salva solo in configurazione, senza aggiornare i record esistenti"}><button type="button" className={`${dsBtnNeutral} min-h-[2.75rem] sm:min-h-0`} onClick={onCancel} disabled={pending}>
            Solo configurazione
          </button></Tooltip>
          <Tooltip content={"Aggiorna mezzi, preventivi, schede e altri record collegati"}><button type="button" className={`${dsBtnPrimary} min-h-[2.75rem] sm:min-h-0`} onClick={onConfirm} disabled={pending}>
            {pending ? "Aggiornamento…" : "Propaga ovunque"}
          </button></Tooltip>
        </div>
      }
    >
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Hai rinominato {entries.length} {entries.length === 1 ? "elemento" : "elementi"}. Vuoi aggiornare anche i record
        esistenti (mezzi, preventivi, schede ingresso, magazzino, documenti, profili portale)?
      </p>
      <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-[color:var(--cab-text-muted)] gestionale-scrollbar">
        {entries.map((e) => (
          <li key={`${e.kind}-${e.from}-${e.to}`}>
            <span className="font-medium text-[color:var(--cab-text)]">{e.from}</span>
            {" → "}
            <span className="font-medium text-[color:var(--cab-text)]">{e.to}</span>
          </li>
        ))}
      </ul>
    </GestionaleConfirmDialog>
  );
}
