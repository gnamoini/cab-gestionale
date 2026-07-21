import {
  mapCaptureFieldsToIngresso,
  mapCaptureHeaderToIngressoSlice,
  resolveCaptureFieldValue,
  resolveRawFieldValue,
  type CaptureFieldRow,
} from "@/lib/document-capture/capture-field-mapper";
import { emptySchedaIngressoFields } from "@/lib/domain/intervento-context/build-intervento-context";
import { normalizeVehicleIdentifier } from "@/lib/schede/normalize-vehicle-identifier";
import type { SchedaIngressoFields, SchedaTipo } from "@/types/schede";

const MAX_LAVORAZIONI_RIGHE = 24;
const MAX_RICAMBI_RIGHE = 34;

/** Stesse chiavi di capture-field-mapper — solo lettura ident ingresso senza overlay footer lav/ric. */
type IngressoIdentStringKey = Exclude<
  keyof SchedaIngressoFields,
  "targetType" | "attrezzaturaId" | "richiedenteFirma" | "addettoFirma"
>;
const INGRESSO_IDENT_KEY_MAP: Record<string, IngressoIdentStringKey> = {
  cliente: "cliente",
  matricola: "matricola",
  attrezzatura_matricola: "matricola",
  nscuderia: "nScuderia",
  n_scuderia: "nScuderia",
  numero_scuderia: "nScuderia",
  targa: "targa",
};

function normCaptureKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

export type CaptureSchedaTipoDetected = Extract<SchedaTipo, "ingresso" | "lavorazioni" | "ricambi">;

const MULTI_SCHEDA_ORDER: CaptureSchedaTipoDetected[] = ["ingresso", "lavorazioni", "ricambi"];

function hasLavorazioniSignals(fields: readonly CaptureFieldRow[]): boolean {
  const explicit = resolveRawFieldValue(fields, "scheda_tipo", "schedatipo").toLowerCase();
  if (explicit === "lavorazioni") return true;
  for (let n = 1; n <= MAX_LAVORAZIONI_RIGHE; n += 1) {
    if (resolveRawFieldValue(fields, `riga_${n}_lavorazione`, `riga_${n}_ore`)) return true;
  }
  return false;
}

function hasRicambiSignals(fields: readonly CaptureFieldRow[]): boolean {
  const explicit = resolveRawFieldValue(fields, "scheda_tipo", "schedatipo").toLowerCase();
  if (explicit === "ricambi") return true;
  for (let n = 1; n <= MAX_RICAMBI_RIGHE; n += 1) {
    if (
      resolveRawFieldValue(fields, `riga_${n}_codice`, `riga_${n}_descrizione`, `riga_${n}_qt`, `riga_${n}_data`)
    ) {
      return true;
    }
  }
  return false;
}

function hasIngressoSignals(fields: readonly CaptureFieldRow[]): boolean {
  const explicit = resolveRawFieldValue(fields, "scheda_tipo", "schedatipo").toLowerCase();
  if (explicit === "ingresso") return true;
  const keys = [
    "data_ingresso",
    "descrizione_anomalia",
    "tipo_attrezzatura",
    "attrezzatura",
    "marca_attrezzatura",
    "modello_attrezzatura",
    "livello_carburante",
    "addetto_accettazione",
    "firma_richiedente",
    "firma_addetto",
    "utilizzatore",
    "cantiere",
    "attrezzatura_matricola",
    "vin",
    "km",
  ];
  return keys.some((k) => resolveRawFieldValue(fields, k));
}

/** Tipi scheda CAB rilevati nello stesso documento (ordine fisso). */
export function detectCaptureSchedaTipos(fields: readonly CaptureFieldRow[]): CaptureSchedaTipoDetected[] {
  const found = new Set<CaptureSchedaTipoDetected>();
  if (hasIngressoSignals(fields)) found.add("ingresso");
  if (hasLavorazioniSignals(fields)) found.add("lavorazioni");
  if (hasRicambiSignals(fields)) found.add("ricambi");
  if (found.size === 0 && fields.length > 0) found.add("ingresso");
  return MULTI_SCHEDA_ORDER.filter((t) => found.has(t));
}

export function isCaptureMultiSchedaBundle(tipos: readonly CaptureSchedaTipoDetected[]): boolean {
  return tipos.includes("ingresso") && tipos.some((t) => t === "lavorazioni" || t === "ricambi");
}

export function captureMultiSchedaPostIngressoQueue(
  tipos: readonly CaptureSchedaTipoDetected[],
): Array<Extract<SchedaTipo, "lavorazioni" | "ricambi">> {
  return tipos.filter((t): t is "lavorazioni" | "ricambi" => t === "lavorazioni" || t === "ricambi");
}

export function formatCaptureMultiSchedaLabels(tipos: readonly CaptureSchedaTipoDetected[]): string {
  const labels: Record<CaptureSchedaTipoDetected, string> = {
    ingresso: "ingresso",
    lavorazioni: "lavorazioni",
    ricambi: "ricambi",
  };
  return tipos.map((t) => labels[t]).join(", ");
}

type IdentSlice = {
  cliente: string;
  targa: string;
  matricola: string;
  nScuderia: string;
};

function normCliente(v: string): string {
  return v.trim().toLowerCase();
}

function ingressoIdentSlice(fields: readonly CaptureFieldRow[]): IdentSlice {
  const out = emptySchedaIngressoFields();
  for (const row of fields) {
    const mapped = INGRESSO_IDENT_KEY_MAP[normCaptureKey(row.field_key)];
    if (!mapped) continue;
    out[mapped] = resolveCaptureFieldValue(row);
  }
  return {
    cliente: out.cliente.trim(),
    targa: out.targa.trim(),
    matricola: out.matricola.trim(),
    nScuderia: out.nScuderia.trim(),
  };
}

function lavRicHeaderSlice(fields: readonly CaptureFieldRow[]): IdentSlice {
  const header = mapCaptureHeaderToIngressoSlice(fields);
  return {
    cliente: (header.cliente ?? "").trim(),
    targa: (header.targa ?? "").trim(),
    matricola: (header.matricola ?? "").trim(),
    nScuderia: "",
  };
}

function ingressoCampiSlice(campi: SchedaIngressoFields): IdentSlice {
  return {
    cliente: campi.cliente.trim(),
    targa: campi.targa.trim(),
    matricola: campi.matricola.trim(),
    nScuderia: campi.nScuderia.trim(),
  };
}

const IDENT_CHECKS: Array<{
  label: string;
  key: keyof IdentSlice;
  norm: (v: string) => string;
}> = [
  { label: "Cliente", key: "cliente", norm: normCliente },
  { label: "Targa", key: "targa", norm: (v) => normalizeVehicleIdentifier("targa", v) },
  { label: "Matricola", key: "matricola", norm: (v) => normalizeVehicleIdentifier("matricola", v) },
  { label: "N. scuderia", key: "nScuderia", norm: (v) => normalizeVehicleIdentifier("scuderia", v) },
];

function collectDistinctLabels(
  slices: Array<{ source: string; slice: IdentSlice }>,
  key: keyof IdentSlice,
  norm: (v: string) => string,
): string[] {
  const byNorm = new Map<string, string>();
  for (const { slice } of slices) {
    const raw = slice[key];
    if (!raw) continue;
    const n = norm(raw);
    if (!n) continue;
    if (!byNorm.has(n)) byNorm.set(n, raw);
  }
  return [...byNorm.values()];
}

function mismatchWarningsForSlices(slices: Array<{ source: string; slice: IdentSlice }>): string[] {
  const out: string[] = [];
  for (const { label, key, norm } of IDENT_CHECKS) {
    const distinct = collectDistinctLabels(slices, key, norm);
    if (distinct.length > 1) {
      out.push(`${label}: valori diversi tra le schede (${distinct.join(" · ")}).`);
    }
  }
  return out;
}

/** Confronta identificativi tra sezioni lette nello stesso file. */
export function checkCaptureMultiSchedaIdentMismatches(fields: readonly CaptureFieldRow[]): string[] {
  const tipos = detectCaptureSchedaTipos(fields);
  const slices: Array<{ source: string; slice: IdentSlice }> = [];
  if (tipos.includes("ingresso")) {
    slices.push({ source: "ingresso", slice: ingressoIdentSlice(fields) });
  }
  if (tipos.includes("lavorazioni") || tipos.includes("ricambi")) {
    slices.push({ source: "lav_ric", slice: lavRicHeaderSlice(fields) });
  }
  if (slices.length < 2) return [];
  return mismatchWarningsForSlices(slices);
}

/** Dopo creazione ingresso: confronta scheda salvata vs header lavorazioni/ricambi nel file. */
export function checkCaptureIngressoVsSheetsIdent(
  ingressoCampi: SchedaIngressoFields,
  fields: readonly CaptureFieldRow[],
  postIngressoStages: readonly ("lavorazioni" | "ricambi")[],
): string[] {
  if (postIngressoStages.length === 0) return [];
  const slices: Array<{ source: string; slice: IdentSlice }> = [
    { source: "ingresso", slice: ingressoCampiSlice(ingressoCampi) },
    { source: "lav_ric", slice: lavRicHeaderSlice(fields) },
  ];
  return mismatchWarningsForSlices(slices);
}
