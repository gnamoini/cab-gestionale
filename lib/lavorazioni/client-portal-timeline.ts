import {
  buildClientPortalRowFields,
  clientPortalAttrezzaturaLabel,
  clientPortalCantiereLabel,
  clientPortalClienteLabel,
  clientPortalDataIngressoLabel,
  clientPortalMezzoIdent,
} from "@/lib/lavorazioni/client-portal-row-fields";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

export type ClientTimelineHeader = {
  cliente: string;
  cantiere: string;
  attrezzatura: string;
  targa: string;
  matricola: string;
  /** Etichetta leggibile senza codici tecnici (Cliente · Attrezzatura · Targa). */
  identificativo: string;
};

export type ClientTimelineIngressoField = {
  label: string;
  value: string;
  multiline?: boolean;
};

export type ClientTimelineEvent = {
  id: string;
  at: string;
  title: string;
  subtitle?: string;
};

const INGRESSO_LABELS: { key: keyof SchedaIngressoFields; label: string; multiline?: boolean }[] = [
  { key: "dataIngresso", label: "Data ingresso" },
  { key: "cliente", label: "Cliente" },
  { key: "cantiere", label: "Cantiere" },
  { key: "utilizzatore", label: "Utilizzatore" },
  { key: "tipoAttrezzatura", label: "Tipo attrezzatura" },
  { key: "marcaAttrezzatura", label: "Marca attrezzatura" },
  { key: "modelloAttrezzatura", label: "Modello attrezzatura" },
  { key: "targa", label: "Targa" },
  { key: "matricola", label: "Matricola" },
  { key: "nScuderia", label: "N. scuderia" },
  { key: "tipoTelaio", label: "Tipo telaio" },
  { key: "marcaTelaio", label: "Marca telaio" },
  { key: "modelloTelaio", label: "Modello telaio" },
  { key: "km", label: "Km" },
  { key: "descrizioneAnomalia", label: "Descrizione anomalia", multiline: true },
  { key: "livelloCarburante", label: "Livello carburante" },
  { key: "addettoAccettazione", label: "Addetto accettazione" },
  { key: "richiedente", label: "Richiedente" },
  { key: "noteIntervento", label: "Note intervento", multiline: true },
];

function ingressoFieldsFromRow(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  logs: readonly LogModificaRow[],
  addettiGlobali: readonly string[],
): SchedaIngressoFields {
  const bundle = getOrCreateBundle(schedeStore, row.id);
  if (bundle.ingresso?.campi) return bundle.ingresso.campi;
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

export function buildClientTimelineHeader(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
): ClientTimelineHeader {
  const ident = clientPortalMezzoIdent(row, schedeStore);
  const cliente = clientPortalClienteLabel(row, schedeStore);
  const cantiere = clientPortalCantiereLabel(row, schedeStore);
  const attrezzatura = clientPortalAttrezzaturaLabel(row, schedeStore);
  const targa = ident.targa;
  const parts = [cliente !== "—" ? cliente : null, attrezzatura !== "—" ? attrezzatura : null, targa !== "—" ? targa : null].filter(
    Boolean,
  );
  return {
    cliente,
    cantiere,
    attrezzatura,
    targa,
    matricola: ident.matricola,
    identificativo: parts.length > 0 ? parts.join(" · ") : "Lavorazione in corso",
  };
}

export function buildClientTimelineIngressoFields(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  logs: readonly LogModificaRow[],
  addettiGlobali: readonly string[],
): ClientTimelineIngressoField[] {
  const fields = ingressoFieldsFromRow(row, schedeStore, logs, addettiGlobali);
  return INGRESSO_LABELS.map(({ key, label, multiline }) => ({
    label,
    value: fields[key]?.trim() || "—",
    multiline,
  }));
}

export function buildClientTimelineEvents(
  logs: readonly LogModificaRow[],
  statiOpts: { id: string; label: string; color?: string }[] = [],
): ClientTimelineEvent[] {
  const items: ClientTimelineEvent[] = [];

  for (const lg of logs) {
    if (lg.azione === "RESTORE") {
      items.push({
        id: `restore-${lg.id}`,
        at: lg.created_at,
        title: "Lavorazione ripristinata",
      });
      continue;
    }
    if (lg.azione !== "UPDATE") continue;
    const payload = lg.payload as { before?: Record<string, unknown>; after?: Record<string, unknown> } | null | undefined;
    const before = payload?.before;
    const after = payload?.after;
    if (before?.stato !== after?.stato && typeof after?.stato === "string") {
      const statoLabel = statoLavorazioneLabel(after.stato, statiOpts);
      items.push({
        id: `stato-${lg.id}`,
        at: lg.created_at,
        title: `Stato · ${statoLabel}`,
      });
    }
  }

  items.sort((a, b) => b.at.localeCompare(a.at));
  return items;
}

export function fmtClientTimelineWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function buildClientTimelineIngressoAt(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
): string {
  const bundle = getOrCreateBundle(schedeStore, row.id);
  if (bundle.ingresso?.updatedAt) return bundle.ingresso.updatedAt;
  return row.data_ingresso ?? row.created_at ?? new Date().toISOString();
}
