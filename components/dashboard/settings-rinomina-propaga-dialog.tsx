"use client";

import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
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
  if (!open || entries.length === 0) return null;

  return (
    <LavorazioniModalShell onRequestClose={pending ? () => {} : onCancel} title="Propagare le modifiche?">
      <div className="p-4 sm:p-6">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Hai rinominato {entries.length} {entries.length === 1 ? "elemento" : "elementi"}. Vuoi aggiornare anche i record
          esistenti (lavorazioni, mezzi, preventivi, magazzino, documenti)?
        </p>
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-[color:var(--cab-text-muted)]">
          {entries.map((e) => (
            <li key={`${e.kind}-${e.from}-${e.to}`}>
              <span className="font-medium text-[color:var(--cab-text)]">{e.from}</span>
              {" → "}
              <span className="font-medium text-[color:var(--cab-text)]">{e.to}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={onCancel} disabled={pending}>
            Solo impostazioni
          </button>
          <button type="button" className={dsBtnPrimary} onClick={onConfirm} disabled={pending}>
            {pending ? "Aggiornamento…" : "Propaga ovunque"}
          </button>
        </div>
      </div>
    </LavorazioniModalShell>
  );
}
