"use client";

import { buildClientTimelineIngressoFields } from "@/lib/lavorazioni/client-portal-timeline";
import { IconGestionaleRefresh } from "@/components/gestionale/gestionale-log-ui";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

function ReadOnlyField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      {multiline ? (
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">{value}</p>
      ) : (
        <p className="mt-0.5 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{value}</p>
      )}
    </div>
  );
}

export function ClientLavorazioneInformazioniPanel({
  row,
  schedeStore,
  logs,
  addettiGlobali,
  onRefresh,
  refreshBusy,
}: {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  logs: readonly LogModificaRow[];
  addettiGlobali: readonly string[];
  onRefresh: () => void;
  refreshBusy?: boolean;
}) {
  const fields = buildClientTimelineIngressoFields(row, schedeStore, logs, addettiGlobali);

  return (
    <section aria-label="Informazioni lavorazione" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Informazioni
        </h3>
        <button
          type="button"
          className={dsPageToolbarBtn}
          onClick={() => void onRefresh()}
          disabled={refreshBusy}
          aria-busy={refreshBusy}
        >
          <IconGestionaleRefresh className={refreshBusy ? "animate-spin" : undefined} />
          {refreshBusy ? "Aggiornamento…" : "Aggiorna"}
        </button>
      </div>
      <div className="grid gap-3 rounded-xl border border-[color:var(--cab-border)] bg-white px-4 py-3.5 dark:bg-zinc-950/30 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <ReadOnlyField key={f.label} label={f.label} value={f.value} multiline={f.multiline} />
        ))}
      </div>
    </section>
  );
}
