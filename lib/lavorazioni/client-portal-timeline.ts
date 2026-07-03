import {
  buildClientPortalRowFields,
  clientPortalCantiereLabel,
  clientPortalClienteLabel,
  clientPortalDataIngressoLabel,
} from "@/lib/lavorazioni/client-portal-row-fields";
import { resolveLavorazioneContextWithAttrezzatura } from "@/lib/lavorazioni/resolve-lavorazione-context-with-attrezzatura";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import {
  DEFAULT_LAVORAZIONE_STATO_ID,
  DEFAULT_STATI_LAVORAZIONI_WORKFLOW,
  migrateStatoConfigId,
} from "@/lib/lavorazioni/stati-dynamic";
import { isLogReverted } from "@/lib/gestionale-log/undo";
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
  /** Titolo pagina / sottotitolo: Cliente · Lavorazione codice. */
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

type StatoTimelineStep = {
  id: string;
  at: string;
  statoId: string;
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

function readStatoId(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  return migrateStatoConfigId(raw.trim());
}

function readSnapshotRecord(row: LogModificaRow): Record<string, unknown> | null {
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const snap = (p as Record<string, unknown>).snapshot;
  if (snap && typeof snap === "object" && !Array.isArray(snap)) return snap as Record<string, unknown>;
  return null;
}

function readAuditBeforeAfter(row: LogModificaRow): {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
} {
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return {};
  const o = p as Record<string, unknown>;
  const before = o.before;
  const after = o.after;
  return {
    before:
      before && typeof before === "object" && !Array.isArray(before)
        ? (before as Record<string, unknown>)
        : undefined,
    after:
      after && typeof after === "object" && !Array.isArray(after) ? (after as Record<string, unknown>) : undefined,
  };
}

function statoWorkflowIndex(
  statoId: string,
  statiOpts: { id: string; label: string; color?: string }[],
): number {
  const migrated = migrateStatoConfigId(statoId);
  const fromOpts = statiOpts.findIndex((s) => migrateStatoConfigId(s.id) === migrated);
  if (fromOpts >= 0) return fromOpts;
  const fromDefault = DEFAULT_STATI_LAVORAZIONI_WORKFLOW.findIndex((s) => s.id === migrated);
  return fromDefault >= 0 ? fromDefault : 999;
}

function compareStatoSteps(
  a: StatoTimelineStep,
  b: StatoTimelineStep,
  statiOpts: { id: string; label: string; color?: string }[],
): number {
  const ta = new Date(a.at).getTime();
  const tb = new Date(b.at).getTime();
  if (ta !== tb) return ta - tb;
  const order = statoWorkflowIndex(a.statoId, statiOpts) - statoWorkflowIndex(b.statoId, statiOpts);
  if (order !== 0) return order;
  return a.id.localeCompare(b.id);
}

function pushStatoStep(steps: StatoTimelineStep[], step: StatoTimelineStep): void {
  const last = steps[steps.length - 1];
  if (last && last.statoId === step.statoId) return;
  steps.push(step);
}

function ensureAccettazioneFirst(
  steps: StatoTimelineStep[],
  anchorAt: string,
): StatoTimelineStep[] {
  const accId = migrateStatoConfigId(DEFAULT_LAVORAZIONE_STATO_ID);
  if (steps.some((s) => s.statoId === accId)) return steps;
  return [{ id: "stato-synthetic-accettazione", at: anchorAt, statoId: accId }, ...steps];
}

function buildStatoTimelineSteps(
  logs: readonly LogModificaRow[],
  anchorAt: string,
): StatoTimelineStep[] {
  const steps: StatoTimelineStep[] = [];
  const sorted = [...logs]
    .filter((row) => !isLogReverted(row))
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

  for (const lg of sorted) {
    if (lg.azione === "CREATE") {
      const snap = readSnapshotRecord(lg);
      const stato = readStatoId(snap?.stato) ?? readStatoId(readAuditBeforeAfter(lg).after?.stato);
      if (stato) {
        pushStatoStep(steps, { id: `stato-create-${lg.id}`, at: lg.created_at, statoId: stato });
      }
      continue;
    }

    if (lg.azione !== "UPDATE") continue;

    const { before, after } = readAuditBeforeAfter(lg);
    const beforeStato = readStatoId(before?.stato);
    const afterStato = readStatoId(after?.stato);
    if (!afterStato || beforeStato === afterStato) continue;

    if (beforeStato) {
      const last = steps[steps.length - 1];
      if (!last || last.statoId !== beforeStato) {
        pushStatoStep(steps, { id: `stato-before-${lg.id}`, at: lg.created_at, statoId: beforeStato });
      }
    }

    pushStatoStep(steps, { id: `stato-${lg.id}`, at: lg.created_at, statoId: afterStato });
  }

  const withAccettazione = ensureAccettazioneFirst(steps, anchorAt);
  return withAccettazione;
}

export function resolveClientPortalSchedaIngressoFields(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  logs: readonly LogModificaRow[],
  addettiGlobali: readonly string[],
): SchedaIngressoFields {
  const bundle = getOrCreateBundle(schedeStore, row.id);
  if (bundle.ingresso?.campi) return bundle.ingresso.campi;
  const vm = buildClientPortalRowFields(row, schedeStore, logs, addettiGlobali);
  const display = resolveLavorazioneContextWithAttrezzatura(row, schedeStore);
  const m = row.mezzo;
  const attMarca =
    display.targetType === "attrezzatura" && display.attrezzaturaLine !== "—"
      ? vm.marca !== "—"
        ? vm.marca
        : ""
      : "";
  const attModello =
    display.targetType === "attrezzatura" && display.attrezzaturaLine !== "—"
      ? vm.modello !== "—"
        ? vm.modello
        : ""
      : "";
  return {
    dataIngresso: vm.dataIngresso === "—" ? "" : vm.dataIngresso,
    cliente: vm.cliente === "—" ? "" : vm.cliente,
    cantiere: vm.cantiere === "—" ? "" : vm.cantiere,
    utilizzatore: vm.utilizzatore === "—" ? "" : vm.utilizzatore,
    tipoAttrezzatura: m?.tipo_attrezzatura?.trim() ?? "",
    marcaAttrezzatura: attMarca,
    modelloAttrezzatura: attModello,
    matricola: vm.matricola === "—" ? "" : vm.matricola,
    nScuderia: vm.nScuderia === "—" ? "" : vm.nScuderia,
    oreLavoro: "",
    tipoTelaio: m?.tipo_telaio?.trim() ?? "",
    marcaTelaio: m?.marca_telaio?.trim() ?? "",
    modelloTelaio: m?.modello_telaio?.trim() ?? "",
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
  const display = resolveLavorazioneContextWithAttrezzatura(row, schedeStore);
  const cliente = clientPortalClienteLabel(row, schedeStore);
  const cantiere = clientPortalCantiereLabel(row, schedeStore);
  const attrezzatura = display.oggettoLabel;
  const targa = display.ident.targa;
  const codice = lavorazioneDisplayCodice({ id: row.id, codice: row.codice });
  const clienteOk = cliente !== "—" ? cliente : null;
  let identificativo: string;
  if (clienteOk && codice) {
    identificativo = `${clienteOk} · Lavorazione ${codice}`;
  } else if (codice) {
    identificativo = `Lavorazione ${codice}`;
  } else if (clienteOk) {
    identificativo = clienteOk;
  } else {
    identificativo = "Lavorazione in corso";
  }
  return {
    cliente,
    cantiere,
    attrezzatura,
    targa,
    matricola: display.ident.matricola,
    identificativo,
  };
}

export function buildClientTimelineIngressoFields(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  logs: readonly LogModificaRow[],
  addettiGlobali: readonly string[],
): ClientTimelineIngressoField[] {
  const fields = resolveClientPortalSchedaIngressoFields(row, schedeStore, logs, addettiGlobali);
  return INGRESSO_LABELS.map(({ key, label, multiline }) => ({
    label,
    value: fields[key]?.trim() || "—",
    multiline,
  }));
}

export function buildClientTimelineEvents(
  logs: readonly LogModificaRow[],
  statiOpts: { id: string; label: string; color?: string }[] = [],
  options?: { anchorAt?: string },
): ClientTimelineEvent[] {
  const anchorAt = options?.anchorAt ?? logs[0]?.created_at ?? new Date(0).toISOString();
  const steps = buildStatoTimelineSteps(logs, anchorAt).sort((a, b) => compareStatoSteps(a, b, statiOpts));

  return steps.map((step) => ({
    id: step.id,
    at: step.at,
    title: `Stato · ${statoLavorazioneLabel(step.statoId, statiOpts)}`,
  }));
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
