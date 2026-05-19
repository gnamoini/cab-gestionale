"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import { useMemo } from "react";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { buildClientPortalRowFields } from "@/lib/lavorazioni/client-portal-row-fields";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

const INGRESSO_FIELD_LABELS: { key: keyof SchedaIngressoFields; label: string }[] = [
  { key: "dataIngresso", label: "Data ingresso" },
  { key: "cliente", label: "Cliente" },
  { key: "cantiere", label: "Cantiere" },
  { key: "utilizzatore", label: "Utilizzatore" },
  { key: "tipoAttrezzatura", label: "Tipo attrezzatura" },
  { key: "marcaAttrezzatura", label: "Marca attrezzatura" },
  { key: "modelloAttrezzatura", label: "Modello attrezzatura" },
  { key: "matricola", label: "Matricola" },
  { key: "nScuderia", label: "N. scuderia" },
  { key: "oreLavoro", label: "Ore lavoro" },
  { key: "tipoTelaio", label: "Tipo telaio" },
  { key: "marcaTelaio", label: "Marca telaio" },
  { key: "modelloTelaio", label: "Modello telaio" },
  { key: "targa", label: "Targa" },
  { key: "km", label: "Km" },
  { key: "descrizioneAnomalia", label: "Descrizione anomalia" },
  { key: "livelloCarburante", label: "Livello carburante" },
  { key: "addettoAccettazione", label: "Addetto accettazione" },
  { key: "richiedente", label: "Richiedente" },
  { key: "noteIntervento", label: "Note intervento" },
];

function fieldsFromOperationalRow(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  logs: readonly LogModificaRow[],
  addettiGlobali: readonly string[],
): SchedaIngressoFields {
  const vm = buildClientPortalRowFields(row, schedeStore, logs, addettiGlobali);
  const m = row.mezzo;
  return {
    dataIngresso: vm.dataIngresso === "—" ? "" : vm.dataIngresso,
    cliente: vm.cliente === "—" ? "" : vm.cliente,
    cantiere: vm.cantiere === "—" ? "" : vm.cantiere,
    utilizzatore: vm.utilizzatore === "—" ? "" : vm.utilizzatore,
    tipoAttrezzatura: m?.tipo_attrezzatura?.trim() ?? "",
    marcaAttrezzatura: m?.marca?.trim() ?? "",
    modelloAttrezzatura: m?.modello?.trim() ?? "",
    matricola: vm.matricola === "—" ? "" : vm.matricola,
    nScuderia: vm.nScuderia === "—" ? "" : vm.nScuderia,
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    targa: vm.targa === "—" ? "" : vm.targa,
    km: "",
    descrizioneAnomalia: row.note?.trim() ?? "",
    livelloCarburante: "",
    addettoAccettazione: vm.addetto === "—" ? "" : vm.addetto,
    richiedente: "",
    noteIntervento: "",
  };
}

function ReadOnlyField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const display = value.trim() || "—";
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      {multiline ? (
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">{display}</p>
      ) : (
        <p className="mt-0.5 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{display}</p>
      )}
    </div>
  );
}

export function ClientLavorazioneIngressoDialog({
  open,
  onClose,
  row,
  schedeStore,
  logs,
  addettiGlobali,
}: {
  open: boolean;
  onClose: () => void;
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  logs: readonly LogModificaRow[];
  addettiGlobali: readonly string[];
}) {
  const bundle = useMemo(() => getOrCreateBundle(schedeStore, row.id), [schedeStore, row.id]);
  const ingressoDoc = bundle.ingresso;
  const fields = ingressoDoc?.campi ?? fieldsFromOperationalRow(row, schedeStore, logs, addettiGlobali);

  if (!open) return null;

  return (
    <LavorazioniModalShell wide maxWidthClass="max-w-3xl" alignTop onRequestClose={onClose} title="Scheda ingresso">
      <div className="lavorazioni-scroll-scope min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
        {!ingressoDoc ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Scheda ingresso non ancora compilata in officina. I campi sotto riflettono i dati operativi disponibili (mezzo e lavorazione).
          </p>
        ) : ingressoDoc.sorgente === "file_esterno" ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
            Scheda caricata da file esterno ({ingressoDoc.fileEsterno?.fileName ?? "documento"}). Consultazione metadati in sola lettura.
          </p>
        ) : null}

        {ingressoDoc ? (
          <p className="text-xs text-zinc-500">
            Ultimo aggiornamento: {new Date(ingressoDoc.updatedAt).toLocaleString("it-IT")} · {ingressoDoc.updatedBy}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INGRESSO_FIELD_LABELS.map(({ key, label }) => (
            <ReadOnlyField
              key={key}
              label={label}
              value={fields[key]}
              multiline={key === "descrizioneAnomalia" || key === "noteIntervento"}
            />
          ))}
        </div>
      </div>
    </LavorazioniModalShell>
  );
}
