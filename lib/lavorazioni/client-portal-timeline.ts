import {
  buildClientPortalRowFields,
  clientPortalCantiereLabel,
  clientPortalClienteLabel,
  clientPortalDataIngressoLabel,
} from "@/lib/lavorazioni/client-portal-row-fields";
import { addettoDisplayNameFromNome, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { resolveLavorazioneContextWithAttrezzatura } from "@/lib/lavorazioni/resolve-lavorazione-context-with-attrezzatura";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import {
  DEFAULT_LAVORAZIONE_STATO_ID,
  DEFAULT_STATI_LAVORAZIONI_WORKFLOW,
  migrateStatoConfigId,
  resolveStatoId,
} from "@/lib/lavorazioni/stati-dynamic";
import { extractPayloadFieldChanges } from "@/lib/gestionale-log/log-summary";
import { isLogReverted } from "@/lib/gestionale-log/undo";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import type { SchedaIngressoStringKey } from "@/lib/schede/scheda-ingresso-typed-fields";
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
  /** Titolo compatto mobile/tablet: solo Lavorazione + codice. */
  identificativoCompact: string;
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
  statoId: string;
};

type StatoTimelineStep = {
  id: string;
  at: string;
  statoId: string;
};

const INGRESSO_LABELS: { key: SchedaIngressoStringKey; label: string; multiline?: boolean }[] = [
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
  { key: "vin", label: "VIN" },
  { key: "km", label: "Km" },
  { key: "descrizioneAnomalia", label: "Descrizione anomalia", multiline: true },
  { key: "livelloCarburante", label: "Livello carburante" },
  { key: "addettoAccettazione", label: "Addetto accettazione" },
  { key: "richiedente", label: "Richiedente" },
  { key: "richiedenteTelefono", label: "Telefono richiedente" },
];

function resolveTimelineStatoId(
  raw: string | null | undefined,
  statiOpts: { id: string; label: string; color?: string }[],
): string | null {
  if (!raw?.trim()) return null;
  return resolveStatoId(raw, statiOpts);
}

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

function readStatoChangeFromUpdateLog(row: LogModificaRow): { before: string | null; after: string | null } {
  const { before, after } = readAuditBeforeAfter(row);
  let beforeStato = readStatoId(before?.stato);
  let afterStato = readStatoId(after?.stato);
  if (beforeStato && afterStato) return { before: beforeStato, after: afterStato };

  const statoChange = extractPayloadFieldChanges(row.payload).find((c) => c.key === "stato");
  if (statoChange) {
    beforeStato = beforeStato ?? readStatoId(statoChange.before);
    afterStato = afterStato ?? readStatoId(statoChange.after);
  }
  return { before: beforeStato, after: afterStato };
}

function sameTimelineStato(
  a: string,
  b: string,
  statiOpts: { id: string; label: string; color?: string }[],
): boolean {
  const ra = resolveTimelineStatoId(a, statiOpts);
  const rb = resolveTimelineStatoId(b, statiOpts);
  return Boolean(ra && rb && ra === rb);
}

function pushStatoStep(
  steps: StatoTimelineStep[],
  step: StatoTimelineStep,
  statiOpts: { id: string; label: string; color?: string }[],
): void {
  const last = steps[steps.length - 1];
  if (last && sameTimelineStato(last.statoId, step.statoId, statiOpts)) return;
  steps.push(step);
}

function findLastTransitionToStato(
  logs: readonly LogModificaRow[],
  targetStatoId: string,
  statiOpts: { id: string; label: string; color?: string }[],
): string | null {
  const sorted = [...logs]
    .filter((row) => !isLogReverted(row))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));

  for (const lg of sorted) {
    if (lg.azione === "UPDATE") {
      const { before, after } = readStatoChangeFromUpdateLog(lg);
      const afterResolved = resolveTimelineStatoId(after, statiOpts);
      const beforeResolved = resolveTimelineStatoId(before, statiOpts);
      if (afterResolved === targetStatoId && beforeResolved !== afterResolved) {
        return lg.created_at;
      }
      continue;
    }

    if (lg.azione === "CREATE") {
      const snap = readSnapshotRecord(lg);
      const stato =
        resolveTimelineStatoId(readStatoId(snap?.stato), statiOpts) ??
        resolveTimelineStatoId(readStatoId(readAuditBeforeAfter(lg).after?.stato), statiOpts);
      if (stato === targetStatoId) return lg.created_at;
    }
  }

  return null;
}

function ensureCurrentStatoInSteps(
  steps: StatoTimelineStep[],
  currentStatoRaw: string | null | undefined,
  currentAt: string | null | undefined,
  logs: readonly LogModificaRow[],
  statiOpts: { id: string; label: string; color?: string }[],
  anchorAt: string,
): StatoTimelineStep[] {
  const currentId = resolveTimelineStatoId(currentStatoRaw, statiOpts);
  if (!currentId) return steps;

  const last = steps[steps.length - 1];
  const transitionAt = findLastTransitionToStato(logs, currentId, statiOpts);
  const resolvedAt = transitionAt ?? currentAt?.trim() ?? anchorAt;

  if (last && sameTimelineStato(last.statoId, currentId, statiOpts)) {
    if (transitionAt && last.at !== transitionAt) {
      return [...steps.slice(0, -1), { ...last, at: transitionAt }];
    }
    return steps;
  }

  return [
    ...steps,
    { id: `stato-current-${currentId}`, at: resolvedAt, statoId: currentId },
  ];
}

function ensureAccettazioneFirst(
  steps: StatoTimelineStep[],
  anchorAt: string,
  statiOpts: { id: string; label: string; color?: string }[],
): StatoTimelineStep[] {
  const accId = resolveStatoId(DEFAULT_LAVORAZIONE_STATO_ID, statiOpts);
  if (steps.some((s) => sameTimelineStato(s.statoId, accId, statiOpts))) return steps;
  return [{ id: "stato-synthetic-accettazione", at: anchorAt, statoId: accId }, ...steps];
}

function buildStatoTimelineSteps(
  logs: readonly LogModificaRow[],
  anchorAt: string,
  statiOpts: { id: string; label: string; color?: string }[],
): StatoTimelineStep[] {
  const steps: StatoTimelineStep[] = [];
  const sorted = [...logs]
    .filter((row) => !isLogReverted(row))
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

  for (const lg of sorted) {
    if (lg.azione === "CREATE") {
      const snap = readSnapshotRecord(lg);
      const rawStato = readStatoId(snap?.stato) ?? readStatoId(readAuditBeforeAfter(lg).after?.stato);
      const stato = resolveTimelineStatoId(rawStato, statiOpts);
      if (stato) {
        pushStatoStep(steps, { id: `stato-create-${lg.id}`, at: lg.created_at, statoId: stato }, statiOpts);
      }
      continue;
    }

    if (lg.azione !== "UPDATE") continue;

    const { before, after } = readStatoChangeFromUpdateLog(lg);
    const beforeStato = resolveTimelineStatoId(before, statiOpts);
    const afterStato = resolveTimelineStatoId(after, statiOpts);
    if (!afterStato || beforeStato === afterStato) continue;

    if (beforeStato) {
      const last = steps[steps.length - 1];
      if (!last || !sameTimelineStato(last.statoId, beforeStato, statiOpts)) {
        pushStatoStep(steps, { id: `stato-before-${lg.id}`, at: lg.created_at, statoId: beforeStato }, statiOpts);
      }
    }

    pushStatoStep(steps, { id: `stato-${lg.id}`, at: lg.created_at, statoId: afterStato }, statiOpts);
  }

  return ensureAccettazioneFirst(steps, anchorAt, statiOpts);
}

function withPortalAddettoDisplayNames(
  campi: SchedaIngressoFields,
  addettiRecords: readonly AddettoRecord[],
): SchedaIngressoFields {
  const acc = campi.addettoAccettazione?.trim();
  if (!acc || acc === "—" || !addettiRecords.length) return campi;
  return { ...campi, addettoAccettazione: addettoDisplayNameFromNome(addettiRecords, acc) };
}

export function resolveClientPortalSchedaIngressoFields(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  addettiGlobali: readonly string[],
  addettiRecords: readonly AddettoRecord[] = [],
): SchedaIngressoFields {
  const bundle = getOrCreateBundle(schedeStore, row.id);
  if (bundle.ingresso?.campi) {
    return withPortalAddettoDisplayNames(bundle.ingresso.campi, addettiRecords);
  }
  const vm = buildClientPortalRowFields(row, schedeStore, addettiGlobali, addettiRecords);
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
    vin: m?.telaio_num?.trim() ?? "",
    targa: vm.targa === "—" ? "" : vm.targa,
    km: "",
    descrizioneAnomalia: row.note?.trim() ?? "",
    livelloCarburante: "",
    addettoAccettazione: vm.addetto === "—" ? "" : vm.addetto,
    richiedente: "",
    richiedenteTelefono: "",
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
  const identificativoCompact = codice ? `Lavorazione ${codice}` : "Lavorazione in corso";
  let identificativo: string;
  if (clienteOk && codice) {
    identificativo = `${clienteOk} · Lavorazione ${codice}`;
  } else if (codice) {
    identificativo = identificativoCompact;
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
    identificativoCompact,
  };
}

export function buildClientTimelineIngressoFields(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  addettiGlobali: readonly string[],
  addettiRecords: readonly AddettoRecord[] = [],
): ClientTimelineIngressoField[] {
  const fields = resolveClientPortalSchedaIngressoFields(
    row,
    schedeStore,
    addettiGlobali,
    addettiRecords,
  );
  return INGRESSO_LABELS.map(({ key, label, multiline }) => ({
    label,
    value: fields[key]?.trim() || "—",
    multiline,
  }));
}

export function buildClientTimelineEvents(
  logs: readonly LogModificaRow[],
  statiOpts: { id: string; label: string; color?: string }[] = [],
  options?: { anchorAt?: string; currentStatoId?: string | null; currentAt?: string | null },
): ClientTimelineEvent[] {
  const anchorAt = options?.anchorAt ?? logs[0]?.created_at ?? new Date(0).toISOString();
  const fromLogs = buildStatoTimelineSteps(logs, anchorAt, statiOpts);
  const steps = ensureCurrentStatoInSteps(
    fromLogs,
    options?.currentStatoId,
    options?.currentAt,
    logs,
    statiOpts,
    anchorAt,
  ).sort((a, b) => compareStatoSteps(a, b, statiOpts));

  return steps.map((step) => ({
    id: step.id,
    at: step.at,
    title: `Stato · ${statoLavorazioneLabel(step.statoId, statiOpts)}`,
    statoId: step.statoId,
  }));
}

/** Portale clienti (sola lettura): date stato da riga, senza log modifiche. */
export function buildClientPortalStatoTimelineFromRow(
  statiOpts: { id: string; label: string; color?: string }[],
  options?: { anchorAt?: string; currentStatoId?: string | null; currentAt?: string | null },
): ClientTimelineEvent[] {
  const anchorAt = options?.anchorAt ?? new Date(0).toISOString();
  const currentAt = options?.currentAt?.trim() || anchorAt;
  const accId = resolveStatoId(DEFAULT_LAVORAZIONE_STATO_ID, statiOpts);
  const currentId = resolveTimelineStatoId(options?.currentStatoId, statiOpts);
  if (!currentId) return [];

  const events: ClientTimelineEvent[] = [
    {
      id: "stato-row-accettazione",
      at: anchorAt,
      title: `Stato · ${statoLavorazioneLabel(accId, statiOpts)}`,
      statoId: accId,
    },
  ];

  if (!sameTimelineStato(accId, currentId, statiOpts)) {
    events.push({
      id: "stato-row-current",
      at: currentAt,
      title: `Stato · ${statoLavorazioneLabel(currentId, statiOpts)}`,
      statoId: currentId,
    });
  }

  return events;
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
