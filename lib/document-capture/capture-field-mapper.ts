import { resolveRicambiRowsFromCaptureFields } from "@/lib/document-capture/ricambi-resolution";
import { formatCaptureMultilineText, isCaptureMultilineFieldKey } from "@/lib/document-capture/capture-field-display-value";
import {
  formatCaptureLavorazioniText,
  isCaptureLavorazioneFieldKey,
} from "@/lib/document-capture/capture-lavorazioni-text";
import {
  normalizeCaptureIngressoDateValue,
  sanitizeCaptureExtractedFieldValue,
} from "@/lib/document-capture/capture-field-key-aliases";
import { parseItalianDayDisplayToIso } from "@/lib/ui/italian-date-input-mask";
import { applyOreLavoroStorageToCampi, resolveOreLavoroFields } from "@/lib/schede/resolve-ore-lavoro-fields";
import type { TagliandoLavorazioneFields } from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import { emptySchedaIngressoFields } from "@/lib/domain/intervento-context/build-intervento-context";
import { findAddettoByStoredName, addettoDisplayName, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { findDuplicateByCodici } from "@/lib/magazzino/duplicates";
import { formatRicambioDescrizioneForUi } from "@/lib/magazzino/ricambio-descrizione-display";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { newRigaId, newSchedaMeta } from "@/lib/schede/schede-ui";
import type { SchedaIngressoStringKey } from "@/lib/schede/scheda-ingresso-typed-fields";
import type {
  LavorazioneSchedeBundle,
  RigaLavorazioneScheda,
  RigaRicambioScheda,
  SchedaIngressoFields,
  SchedaLavorazioniFields,
  SchedaRicambiFields,
  SchedaTipo,
} from "@/types/schede";

const INGRESSO_KEY_MAP: Record<string, SchedaIngressoStringKey> = {
  cliente: "cliente",
  cantiere: "cantiere",
  utilizzatore: "utilizzatore",
  dataingresso: "dataIngresso",
  data_ingresso: "dataIngresso",
  tipoattrezzatura: "tipoAttrezzatura",
  tipo_attrezzatura: "tipoAttrezzatura",
  attrezzatura: "tipoAttrezzatura",
  marcaattrezzatura: "marcaAttrezzatura",
  marca_attrezzatura: "marcaAttrezzatura",
  attrezzatura_marca: "marcaAttrezzatura",
  modelloattrezzatura: "modelloAttrezzatura",
  modello_attrezzatura: "modelloAttrezzatura",
  attrezzatura_modello: "modelloAttrezzatura",
  matricola: "matricola",
  attrezzatura_matricola: "matricola",
  nscuderia: "nScuderia",
  n_scuderia: "nScuderia",
  numero_scuderia: "nScuderia",
  orelavoro: "oreLavoro",
  ore_lavoro: "oreLavoro",
  ore_lavoro_motore: "oreLavoro",
  ore_motore: "oreLavoro",
  ore: "oreLavoro",
  tipotelaio: "tipoTelaio",
  tipo_telaio: "tipoTelaio",
  marcatelaio: "marcaTelaio",
  marca_telaio: "marcaTelaio",
  telaio_marca: "marcaTelaio",
  modellotelaio: "modelloTelaio",
  modello_telaio: "modelloTelaio",
  telaio_modello: "modelloTelaio",
  targa: "targa",
  vin: "vin",
  numero_vin: "vin",
  telaio_vin: "vin",
  km: "km",
  descrizioneanomalia: "descrizioneAnomalia",
  descrizione_anomalia: "descrizioneAnomalia",
  livellocarburante: "livelloCarburante",
  livello_carburante: "livelloCarburante",
  addettoaccettazione: "addettoAccettazione",
  addetto_accettazione: "addettoAccettazione",
  richiedente: "richiedente",
  telefono: "richiedenteTelefono",
  telefono_richiedente: "richiedenteTelefono",
  richiedentetelefono: "richiedenteTelefono",
};

const MAX_LAVORAZIONI_RIGHE = 24;
const MAX_RICAMBI_RIGHE = 34;
/** ponytail: pattern targa IT semplificato — upgrade se servono formati storici/estero */
const IT_TARGA_RE = /^[A-Z]{2}\s?\d{3}\s?[A-Z]{2}$/i;

const LAVORAZIONE_NOTE_CAPTURE_KEYS = new Set(["note", "note_intervento", "noteintervento"]);

function normKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

export type CaptureFieldRow = {
  field_key: string;
  confirmed_value?: string | null;
  normalized_value: string | null;
  raw_value?: string | null;
  confidence?: number | null;
  value_source?: "ai" | "manual" | "existing";
};

function formatResolvedCaptureFieldValue(fieldKey: string, trimmed: string): string {
  if (!trimmed) return "";
  if (isCaptureMultilineFieldKey(fieldKey)) {
    return isCaptureLavorazioneFieldKey(fieldKey)
      ? formatCaptureLavorazioniText(trimmed)
      : formatCaptureMultilineText(trimmed);
  }
  return sanitizeCaptureExtractedFieldValue(fieldKey, trimmed);
}

export function resolveCaptureFieldValue(row: CaptureFieldRow): string {
  if (row.value_source === "manual") {
    const manual = row.confirmed_value?.trim() ?? "";
    return formatResolvedCaptureFieldValue(row.field_key, manual);
  }
  const v = isCaptureMultilineFieldKey(row.field_key)
    ? (row.confirmed_value ?? row.raw_value ?? row.normalized_value ?? "")
    : (row.confirmed_value ?? row.normalized_value ?? "");
  const trimmed = typeof v === "string" ? v.trim() : "";
  return formatResolvedCaptureFieldValue(row.field_key, trimmed);
}

export function resolveRawFieldValue(fields: readonly CaptureFieldRow[], ...keys: string[]): string {
  for (const key of keys) {
    const hit = fields.find((row) => normKey(row.field_key) === key);
    if (!hit) continue;
    const v = resolveCaptureFieldValue(hit);
    if (v) return v;
  }
  return "";
}

/** SSOT: note lavorazione da capture OCR → `lavorazioni.note` (non scheda ingresso). */
export function resolveCaptureLavorazioneNote(fields: readonly CaptureFieldRow[]): string {
  for (const row of fields) {
    const key = normKey(row.field_key);
    if (!LAVORAZIONE_NOTE_CAPTURE_KEYS.has(key)) continue;
    const value = resolveCaptureFieldValue(row).trim();
    if (value) return value;
  }
  return "";
}

const CAPTURE_CHECKBOX_TRUE = new Set([
  "1",
  "true",
  "yes",
  "si",
  "sì",
  "x",
  "✓",
  "✔",
  "v",
  "checked",
  "barrato",
  "spuntato",
  "on",
]);

const CAPTURE_CHECKBOX_FALSE = new Set(["0", "false", "no", "off", "unchecked", "vuoto"]);

/** Interpreta valore OCR checkbox scheda ingresso. */
export function parseCaptureCheckboxValue(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const norm = trimmed.toLowerCase().replace(/\s+/g, "");
  if (CAPTURE_CHECKBOX_FALSE.has(norm)) return false;
  if (CAPTURE_CHECKBOX_TRUE.has(norm)) return true;
  // ponytail: segno grafico non in whitelist → true se non esplicitamente false
  if (/^[x✓✔v\/\\]+$/i.test(trimmed)) return true;
  return true;
}

const TAGLIANDO_CAPTURE_KEY_ALIASES: Record<string, keyof Pick<
  TagliandoLavorazioneFields,
  "repairPresent" | "isTagliando" | "isGaranzia" | "isRecidivo"
>> = {
  riparazione: "repairPresent",
  repair: "repairPresent",
  repair_present: "repairPresent",
  tagliando: "isTagliando",
  is_tagliando: "isTagliando",
  garanzia: "isGaranzia",
  in_garanzia: "isGaranzia",
  ingaranzia: "isGaranzia",
  is_garanzia: "isGaranzia",
  recidivo: "isRecidivo",
  is_recidivo: "isRecidivo",
};

function applyCaptureTipoInterventoLegacy(
  raw: string,
  out: Partial<TagliandoLavorazioneFields>,
): void {
  const norm = raw.trim().toLowerCase();
  if (!norm) return;
  if (norm.includes("tagliando")) out.isTagliando = true;
  if (norm.includes("riparazione") || norm.includes("repair")) out.repairPresent = true;
  if (norm.includes("garanzia")) out.isGaranzia = true;
  if (norm.includes("recidivo")) out.isRecidivo = true;
}

/** Flag intervento scheda ingresso da checkbox OCR. */
export function mapCaptureFieldsToTagliando(
  fields: readonly CaptureFieldRow[],
): Partial<TagliandoLavorazioneFields> {
  const out: Partial<TagliandoLavorazioneFields> = {};

  for (const row of fields) {
    const key = normKey(row.field_key);
    const field = TAGLIANDO_CAPTURE_KEY_ALIASES[key];
    if (field) {
      out[field] = parseCaptureCheckboxValue(resolveCaptureFieldValue(row));
      continue;
    }
    if (key === "tipo_intervento" || key === "tipointervento") {
      applyCaptureTipoInterventoLegacy(resolveCaptureFieldValue(row), out);
    }
  }

  return out;
}

function composeRichiedenteFromCapture(fields: readonly CaptureFieldRow[], current: string): string {
  if (current.trim()) return current.trim();
  const nome = resolveRawFieldValue(fields, "nome");
  const cognome = resolveRawFieldValue(fields, "cognome");
  return [nome, cognome].filter(Boolean).join(" ").trim();
}

function applyIngressoSlice(target: SchedaIngressoFields, slice: Partial<SchedaIngressoFields>): void {
  for (const key of Object.keys(slice) as (keyof SchedaIngressoFields)[]) {
    const v = slice[key];
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") {
      (target as Record<string, unknown>)[key] = v;
      continue;
    }
    if (String(v).trim()) {
      (target as Record<string, unknown>)[key] = String(v);
    }
  }
}

function parseCaptureOre(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function parseCaptureQuantita(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Colonna NOME = addetto; DESCRIZIONE = ricambio. Fallback legacy se solo nome (non addetto). */
const LEGACY_RICAMBIO_MERGE_RE = /^(.+?)\s*[—–-]\s+(.+)$/;

function splitLegacyRicambioMergedCell(value: string): { head: string; tail: string } | null {
  const m = value.trim().match(LEGACY_RICAMBIO_MERGE_RE);
  if (!m) return null;
  const head = m[1]!.trim();
  const tail = m[2]!.trim();
  if (!head || !tail || head.length > 32) return null;
  return { head, tail };
}

function resolveCaptureRicambioAddettoLabel(
  raw: string,
  addettiRecords?: readonly AddettoRecord[],
): string {
  const t = raw.trim();
  if (!t) return "";
  const rec = addettiRecords?.length ? findAddettoByStoredName(addettiRecords, t) : undefined;
  return rec ? addettoDisplayName(rec) : t;
}

function formatRicambioNomeFromOcr(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return formatRicambioDescrizioneForUi(trimmed) || trimmed;
}

export function resolveCaptureRicambioRowText(
  nomeOcr: string,
  descrizioneOcr: string,
  addettiRecords?: readonly AddettoRecord[],
): { ricambioNome: string; addetto: string } {
  const nome = nomeOcr.trim();
  let desc = descrizioneOcr.trim();

  if (!desc && nome) {
    const split = splitLegacyRicambioMergedCell(nome);
    if (split) {
      return {
        ricambioNome: formatRicambioNomeFromOcr(split.tail),
        addetto: resolveCaptureRicambioAddettoLabel(split.head, addettiRecords),
      };
    }
  }

  if (!nome && desc) {
    const split = splitLegacyRicambioMergedCell(desc);
    if (split) {
      return {
        ricambioNome: formatRicambioNomeFromOcr(split.tail),
        addetto: resolveCaptureRicambioAddettoLabel(split.head, addettiRecords),
      };
    }
  }

  if (nome && desc) {
    const splitDesc = splitLegacyRicambioMergedCell(desc);
    if (splitDesc && splitDesc.head.toLowerCase() === nome.toLowerCase()) {
      desc = splitDesc.tail;
    }
  }

  const addettoRec = nome && addettiRecords?.length ? findAddettoByStoredName(addettiRecords, nome) : undefined;
  if (addettoRec) {
    return { ricambioNome: formatRicambioNomeFromOcr(desc), addetto: addettoDisplayName(addettoRec) };
  }
  if (desc) {
    return {
      ricambioNome: formatRicambioNomeFromOcr(desc),
      addetto: resolveCaptureRicambioAddettoLabel(nome, addettiRecords),
    };
  }
  return { ricambioNome: formatRicambioNomeFromOcr(nome), addetto: "" };
}

export function inferCaptureSchedaTipo(fields: readonly CaptureFieldRow[]): SchedaTipo | null {
  const explicit = resolveRawFieldValue(fields, "schedatipo", "scheda_tipo").toLowerCase();
  if (explicit === "lavorazioni" || explicit === "ingresso" || explicit === "ricambi") {
    return explicit;
  }
  for (let n = 1; n <= MAX_LAVORAZIONI_RIGHE; n += 1) {
    if (resolveRawFieldValue(fields, `riga_${n}_lavorazione`, `riga_${n}_ore`)) {
      return "lavorazioni";
    }
  }
  for (let n = 1; n <= MAX_RICAMBI_RIGHE; n += 1) {
    if (
      resolveRawFieldValue(
        fields,
        `riga_${n}_codice`,
        `riga_${n}_descrizione`,
        `riga_${n}_qt`,
        `riga_${n}_nome`,
        `riga_${n}_data`,
      )
    ) {
      return "ricambi";
    }
  }
  return null;
}

export function mapCaptureHeaderToIngressoSlice(fields: readonly CaptureFieldRow[]): Partial<SchedaIngressoFields> {
  const cliente = resolveRawFieldValue(fields, "cliente");
  const targaMatricola = resolveRawFieldValue(fields, "targa_matricola", "targamatricola", "targa/matricola");
  const patch: Partial<SchedaIngressoFields> = {};
  if (cliente) patch.cliente = cliente;
  if (targaMatricola) {
    const compact = targaMatricola.replace(/\s/g, "");
    if (IT_TARGA_RE.test(compact)) {
      patch.targa = targaMatricola;
    } else {
      patch.matricola = targaMatricola;
    }
  }
  return patch;
}

type LavBlockAcc = {
  works: string[];
  date: string;
  nome: string;
  oreRaw: string;
};

type LavPendingMeta = {
  date: string;
  nome: string;
  oreRaw: string;
};

function emptyLavBlockAcc(): LavBlockAcc {
  return { works: [], date: "", nome: "", oreRaw: "" };
}

function applyPendingLavMeta(acc: LavBlockAcc, pending: LavPendingMeta | null): LavPendingMeta | null {
  if (!pending) return null;
  if (pending.date && !acc.date) acc.date = pending.date;
  if (pending.nome && !acc.nome) acc.nome = pending.nome;
  if (pending.oreRaw && !acc.oreRaw) acc.oreRaw = pending.oreRaw;
  return null;
}

function resolveLavRowDateValue(
  dataIsDate: boolean,
  lavIsDate: boolean,
  oreIsDate: boolean,
  dataRaw: string,
  lav: string,
  oreRaw: string,
): string {
  if (dataIsDate) return dataRaw.trim();
  if (lavIsDate) return lav;
  if (oreIsDate) return oreRaw.trim();
  return "";
}

function looksLikeCaptureDateValue(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (parseItalianDayDisplayToIso(t).ok) return true;
  return parseItalianDayDisplayToIso(normalizeCaptureIngressoDateValue(t)).ok;
}

/** Normalizza una data OCR scheda lavorazioni; stringa vuota se non riconosciuta (mai fallback a oggi). */
export function parseCaptureLavorazioneDateValue(raw: string): string {
  const normalized = normalizeCaptureIngressoDateValue(raw.trim());
  if (!normalized || !looksLikeCaptureDateValue(normalized)) return "";
  return normalized;
}

function isCaptureOreValue(raw: string): boolean {
  const t = raw.trim();
  if (!t || looksLikeCaptureDateValue(t)) return false;
  return Number.isFinite(parseFloat(t.replace(",", ".")));
}

function resolveCaptureLavorazioneAddetto(
  nomeRaw: string,
  addettiRecords?: readonly AddettoRecord[],
): string {
  const addettoRec = addettiRecords?.length ? findAddettoByStoredName(addettiRecords, nomeRaw) : undefined;
  return addettoRec ? addettoDisplayName(addettoRec) : nomeRaw;
}

function lavBlockAccToRiga(
  acc: LavBlockAcc,
  addettiRecords?: readonly AddettoRecord[],
): RigaLavorazioneScheda | null {
  const lavorazioni = acc.works
    .map((w) => formatCaptureLavorazioniText(w.trim()))
    .filter(Boolean)
    .join("\n");
  const nomeRaw = acc.nome.trim();
  const oreRaw = acc.oreRaw.trim();
  if (!lavorazioni) return null;

  const nome = resolveCaptureLavorazioneAddetto(nomeRaw, addettiRecords);
  const date = acc.date ? parseCaptureLavorazioneDateValue(acc.date) : "";

  return {
    id: newRigaId(),
    dataLavorazione: date,
    lavorazioniEffettuate: lavorazioni,
    addettiAssegnati: nome || oreRaw ? [{ addetto: nome, oreImpiegate: parseCaptureOre(oreRaw) }] : [],
  };
}

function flushLavBlock(
  acc: LavBlockAcc,
  out: RigaLavorazioneScheda[],
  addettiRecords?: readonly AddettoRecord[],
): void {
  const row = lavBlockAccToRiga(acc, addettiRecords);
  if (row) out.push(row);
}

function lineCountLavorazione(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\n/).filter((line) => line.trim()).length;
}

/** Unisce righe OCR con una sola lavorazione e stessa data (tipico output AI riga-per-riga). */
function mergeSameDateSingleLineLavorazioni(righe: RigaLavorazioneScheda[]): RigaLavorazioneScheda[] {
  if (righe.length < 2) return righe;
  const out: RigaLavorazioneScheda[] = [];
  let idx = 0;
  while (idx < righe.length) {
    const first = righe[idx]!;
    if (lineCountLavorazione(first.lavorazioniEffettuate) !== 1) {
      out.push(first);
      idx += 1;
      continue;
    }
    const works = [first.lavorazioniEffettuate.trim()].filter(Boolean);
    let addetti = first.addettiAssegnati?.filter((a) => a.addetto || a.oreImpiegate) ?? [];
    let j = idx + 1;
    while (j < righe.length) {
      const next = righe[j]!;
      if (next.dataLavorazione !== first.dataLavorazione) break;
      if (lineCountLavorazione(next.lavorazioniEffettuate) !== 1) break;
      const nextAddetti = next.addettiAssegnati?.filter((a) => a.addetto || a.oreImpiegate) ?? [];
      if (addetti.length > 0 && nextAddetti.length > 0) break;
      works.push(next.lavorazioniEffettuate.trim());
      if (nextAddetti.length > 0) addetti = nextAddetti;
      j += 1;
    }
    if (j > idx + 1) {
      out.push({
        ...first,
        lavorazioniEffettuate: works.filter(Boolean).join("\n"),
        addettiAssegnati: addetti,
      });
      idx = j;
    } else {
      out.push(first);
      idx += 1;
    }
  }
  return out;
}

function coalesceCaptureLavorazioniOcrRows(
  fields: readonly CaptureFieldRow[],
  addettiRecords?: readonly AddettoRecord[],
): RigaLavorazioneScheda[] {
  const out: RigaLavorazioneScheda[] = [];
  let acc = emptyLavBlockAcc();
  let pending: LavPendingMeta | null = null;

  for (let n = 1; n <= MAX_LAVORAZIONI_RIGHE; n += 1) {
    const lavorazione = resolveRawFieldValue(fields, `riga_${n}_lavorazione`);
    const nomeRaw = resolveRawFieldValue(fields, `riga_${n}_nome`);
    const oreRaw = resolveRawFieldValue(fields, `riga_${n}_ore`);
    const dataRaw = resolveRawFieldValue(fields, `riga_${n}_data`);
    if (!lavorazione && !nomeRaw && !oreRaw && !dataRaw) continue;

    const lav = lavorazione.trim();
    const rowHasAddetti = Boolean(nomeRaw.trim()) || isCaptureOreValue(oreRaw);
    const lavIsDate = lav.length > 0 && looksLikeCaptureDateValue(lav);
    const dataIsDate = dataRaw.trim().length > 0 && looksLikeCaptureDateValue(dataRaw);
    const oreIsDate = !lav && oreRaw.trim().length > 0 && looksLikeCaptureDateValue(oreRaw);
    const rowHasDate = dataIsDate || lavIsDate || oreIsDate;

    if (lav && dataIsDate && !lavIsDate && acc.works.length === 0) {
      pending = applyPendingLavMeta(acc, pending);
      flushLavBlock(acc, out, addettiRecords);
      acc = emptyLavBlockAcc();
      const row = lavBlockAccToRiga({ works: [lav], date: dataRaw, nome: nomeRaw, oreRaw }, addettiRecords);
      if (row) out.push(row);
      continue;
    }

    if (rowHasDate) {
      if (lav && !lavIsDate) {
        pending = applyPendingLavMeta(acc, pending);
        acc.works.push(lav);
      }
      if (acc.works.length > 0) {
        const dateVal = resolveLavRowDateValue(dataIsDate, lavIsDate, oreIsDate, dataRaw, lav, oreRaw);
        if (dateVal) acc.date = dateVal;
        if (nomeRaw) acc.nome = nomeRaw;
        if (isCaptureOreValue(oreRaw)) acc.oreRaw = oreRaw;
        flushLavBlock(acc, out, addettiRecords);
        acc = emptyLavBlockAcc();
        pending = null;
        continue;
      }

      const dateVal = resolveLavRowDateValue(dataIsDate, lavIsDate, oreIsDate, dataRaw, lav, oreRaw);
      pending = {
        date: dateVal || pending?.date || "",
        nome: nomeRaw || pending?.nome || "",
        oreRaw: isCaptureOreValue(oreRaw) ? oreRaw : pending?.oreRaw || "",
      };
      continue;
    }

    if (lav && rowHasAddetti && acc.works.length === 0) {
      pending = applyPendingLavMeta(acc, pending);
      const row = lavBlockAccToRiga(
        {
          works: [lav],
          date: acc.date,
          nome: nomeRaw || acc.nome,
          oreRaw: isCaptureOreValue(oreRaw) ? oreRaw : acc.oreRaw,
        },
        addettiRecords,
      );
      acc = emptyLavBlockAcc();
      pending = null;
      if (row) out.push(row);
      continue;
    }

    if (lav && rowHasAddetti && acc.works.length > 0) {
      pending = applyPendingLavMeta(acc, pending);
      acc.works.push(lav);
      acc.nome = nomeRaw;
      if (isCaptureOreValue(oreRaw)) acc.oreRaw = oreRaw;
      flushLavBlock(acc, out, addettiRecords);
      acc = emptyLavBlockAcc();
      pending = null;
      continue;
    }

    if (lav) {
      pending = applyPendingLavMeta(acc, pending);
      acc.works.push(lav);
      continue;
    }

    if (rowHasAddetti && acc.works.length > 0) {
      pending = applyPendingLavMeta(acc, pending);
      acc.nome = nomeRaw;
      if (isCaptureOreValue(oreRaw)) acc.oreRaw = oreRaw;
      if (dataRaw.trim()) acc.date = dataRaw.trim();
      flushLavBlock(acc, out, addettiRecords);
      acc = emptyLavBlockAcc();
      pending = null;
    }
  }

  pending = applyPendingLavMeta(acc, pending);
  flushLavBlock(acc, out, addettiRecords);
  return mergeSameDateSingleLineLavorazioni(out);
}

export function parseCaptureLavorazioniRighe(
  fields: readonly CaptureFieldRow[],
  addettiRecords?: readonly AddettoRecord[],
): RigaLavorazioneScheda[] {
  return coalesceCaptureLavorazioniOcrRows(fields, addettiRecords);
}

export function mapCaptureFieldsToLavorazioni(
  fields: readonly CaptureFieldRow[],
  addettiRecords?: readonly AddettoRecord[],
): SchedaLavorazioniFields {
  const targaMatricola = resolveRawFieldValue(fields, "targa_matricola", "targamatricola", "targa/matricola");
  return {
    identificazioneMacchina: targaMatricola,
    righe: parseCaptureLavorazioniRighe(fields, addettiRecords),
  };
}

export function parseCaptureRicambiRighe(
  fields: readonly CaptureFieldRow[],
  magazzino?: readonly RicambioMagazzino[],
  addettiRecords?: readonly AddettoRecord[],
): RigaRicambioScheda[] {
  const resolutions =
    magazzino && magazzino.length > 0 ? resolveRicambiRowsFromCaptureFields(fields, magazzino) : [];
  const byRow = new Map(resolutions.map((r) => [r.rowIndex, r]));
  const magById = new Map((magazzino ?? []).map((m) => [m.id, m]));

  const out: RigaRicambioScheda[] = [];
  for (let n = 1; n <= MAX_RICAMBI_RIGHE; n += 1) {
    const nome = resolveRawFieldValue(fields, `riga_${n}_nome`);
    const codice = resolveRawFieldValue(fields, `riga_${n}_codice`);
    const descrizione = resolveRawFieldValue(fields, `riga_${n}_descrizione`);
    const qtRaw = resolveRawFieldValue(fields, `riga_${n}_qt`);
    const data = resolveRawFieldValue(fields, `riga_${n}_data`);
    if (!nome && !codice && !descrizione && !qtRaw && !data) continue;

    const resolved = byRow.get(n);
    let ricambioId: string | null = null;
    let codiceOut = codice;
    if (resolved?.status === "MATCHED" && resolved.ricambioId) {
      ricambioId = resolved.ricambioId;
      const item = magById.get(resolved.ricambioId);
      if (item?.codiceFornitoreOriginale) codiceOut = item.codiceFornitoreOriginale;
    } else if (!resolutions.length && codice && magazzino?.length) {
      const dup = findDuplicateByCodici([...magazzino], codice);
      ricambioId = dup?.id ?? null;
      if (dup?.codiceFornitoreOriginale) codiceOut = dup.codiceFornitoreOriginale;
    }

    const { ricambioNome, addetto } = resolveCaptureRicambioRowText(nome, descrizione, addettiRecords);
    out.push({
      id: newRigaId(),
      ricambioId,
      ricambioNome,
      codice: codiceOut,
      quantita: parseCaptureQuantita(qtRaw),
      addetto,
      dataUtilizzo: data.trim() ? parseCaptureLavorazioneDateValue(data) : "",
    });
  }
  return out;
}

export function mapCaptureFieldsToRicambi(
  fields: readonly CaptureFieldRow[],
  magazzino?: readonly RicambioMagazzino[],
  addettiRecords?: readonly AddettoRecord[],
): SchedaRicambiFields {
  const targaMatricola = resolveRawFieldValue(fields, "targa_matricola", "targamatricola", "targa/matricola");
  return {
    identificazioneMacchina: targaMatricola,
    righe: parseCaptureRicambiRighe(fields, magazzino, addettiRecords),
  };
}

export function mapCaptureFieldsToIngresso(
  fields: readonly CaptureFieldRow[],
  addettiRecords?: readonly AddettoRecord[],
): SchedaIngressoFields {
  const out = emptySchedaIngressoFields();
  for (const row of fields) {
    const nk = normKey(row.field_key);
    if (nk === "ore_lavoro_pto" || nk === "ore_pto" || nk === "orelavoro_pto") {
      const pto = resolveCaptureFieldValue(row);
      const ore = resolveOreLavoroFields({
        oreLavoro: out.oreLavoro,
        oreLavoroPto: pto,
      });
      applyOreLavoroStorageToCampi(out as Record<string, unknown>, ore);
      out.oreLavoro = ore.oreLavoroMotore;
      continue;
    }
    const mapped = INGRESSO_KEY_MAP[nk];
    if (!mapped) continue;
    out[mapped] = resolveCaptureFieldValue(row);
  }
  out.richiedente = composeRichiedenteFromCapture(fields, out.richiedente);
  if (out.addettoAccettazione.trim() && addettiRecords?.length) {
    const rec = findAddettoByStoredName(addettiRecords, out.addettoAccettazione);
    if (rec) out.addettoAccettazione = addettoDisplayName(rec);
  }
  applyIngressoSlice(out, mapCaptureHeaderToIngressoSlice(fields));
  if (out.dataIngresso.trim()) {
    out.dataIngresso = normalizeCaptureIngressoDateValue(out.dataIngresso);
  }
  return out;
}

function emptyLavorazioniFields(): SchedaLavorazioniFields {
  return { identificazioneMacchina: "", righe: [] };
}

function emptyRicambiFields(): SchedaRicambiFields {
  return { identificazioneMacchina: "", righe: [] };
}

function buildLavorazioniFromIngresso(ingressoFields: SchedaIngressoFields): SchedaLavorazioniFields {
  return {
    ...emptyLavorazioniFields(),
    identificazioneMacchina:
      [ingressoFields.marcaAttrezzatura, ingressoFields.modelloAttrezzatura, ingressoFields.matricola]
        .filter(Boolean)
        .join(" ")
        .trim() || ingressoFields.targa,
    righe: [
      {
        id: newRigaId(),
        dataLavorazione: ingressoFields.dataIngresso,
        lavorazioniEffettuate: ingressoFields.descrizioneAnomalia,
        addettiAssegnati: ingressoFields.addettoAccettazione
          ? [{ addetto: ingressoFields.addettoAccettazione, oreImpiegate: 0 }]
          : [],
      },
    ],
  };
}

function buildRicambiFromIngresso(ingressoFields: SchedaIngressoFields): SchedaRicambiFields {
  return {
    ...emptyRicambiFields(),
    identificazioneMacchina:
      [ingressoFields.marcaAttrezzatura, ingressoFields.modelloAttrezzatura].filter(Boolean).join(" ").trim() ||
      ingressoFields.targa,
  };
}

export function buildCaptureSchedeBundle(input: {
  lavorazioneId: string;
  fields: readonly CaptureFieldRow[];
  createdBy: string;
  includeLavorazioni?: boolean;
  includeRicambi?: boolean;
  schedaTipo?: SchedaTipo | null;
  addettiRecords?: readonly AddettoRecord[];
  magazzino?: readonly RicambioMagazzino[];
}): LavorazioneSchedeBundle {
  const schedaTipo = input.schedaTipo ?? inferCaptureSchedaTipo(input.fields);
  const ingressoFields = mapCaptureFieldsToIngresso(input.fields, input.addettiRecords);
  const user = input.createdBy.trim() || "Document Capture";

  const bundle: LavorazioneSchedeBundle = {
    lavorazioneId: input.lavorazioneId,
    codice: null,
    ingresso: {
      ...newSchedaMeta("ingresso", user),
      tipo: "ingresso",
      campi: ingressoFields,
    },
    lavorazioni: null,
    ricambi: null,
  };

  if (input.includeLavorazioni) {
    const lavCampi =
      schedaTipo === "lavorazioni"
        ? mapCaptureFieldsToLavorazioni(input.fields, input.addettiRecords)
        : buildLavorazioniFromIngresso(ingressoFields);
    bundle.lavorazioni = {
      ...newSchedaMeta("lavorazioni", user),
      tipo: "lavorazioni",
      campi: lavCampi,
    };
  }

  if (input.includeRicambi) {
    const ricCampi =
      schedaTipo === "ricambi"
        ? mapCaptureFieldsToRicambi(input.fields, input.magazzino, input.addettiRecords)
        : buildRicambiFromIngresso(ingressoFields);
    bundle.ricambi = {
      ...newSchedaMeta("ricambi", user),
      tipo: "ricambi",
      campi: ricCampi,
    };
  }

  return bundle;
}

export async function fetchCaptureFieldRows(captureId: string): Promise<CaptureFieldRow[]> {
  const res = await fetch(`/api/document-capture/${captureId}/fields`);
  if (!res.ok) throw new Error("Impossibile caricare i dati letti");
  const body = (await res.json()) as {
    fields?: Array<{
      field_key: string;
      confirmed_value: string | null;
      normalized_value: string | null;
      raw_value?: string | null;
    }>;
  };
  return (body.fields ?? []).map((f) => ({
    field_key: f.field_key,
    confirmed_value: f.confirmed_value,
    normalized_value: f.normalized_value,
    raw_value: f.raw_value ?? null,
    value_source: (f as { value_source?: CaptureFieldRow["value_source"] }).value_source,
  }));
}

export async function fetchCaptureIngressoFields(captureId: string): Promise<SchedaIngressoFields> {
  return mapCaptureFieldsToIngresso(await fetchCaptureFieldRows(captureId));
}

export function buildCaptureBundleSchedaPatch(input: {
  lavorazioneId: string;
  schedaTipo: "lavorazioni" | "ricambi";
  fields: readonly CaptureFieldRow[];
  createdBy: string;
  addettiRecords?: readonly AddettoRecord[];
  magazzino?: readonly RicambioMagazzino[];
}): Pick<LavorazioneSchedeBundle, "lavorazioni" | "ricambi"> {
  const bundle = buildCaptureSchedeBundle({
    lavorazioneId: input.lavorazioneId,
    fields: input.fields,
    createdBy: input.createdBy,
    includeLavorazioni: input.schedaTipo === "lavorazioni",
    includeRicambi: input.schedaTipo === "ricambi",
    schedaTipo: input.schedaTipo,
    addettiRecords: input.addettiRecords,
    magazzino: input.magazzino,
  });
  return { lavorazioni: bundle.lavorazioni, ricambi: bundle.ricambi };
}

export function buildCaptureMultiSchedaBundlePatch(input: {
  lavorazioneId: string;
  fields: readonly CaptureFieldRow[];
  createdBy: string;
  stages: readonly ("lavorazioni" | "ricambi")[];
  addettiRecords?: readonly AddettoRecord[];
  magazzino?: readonly RicambioMagazzino[];
}): Pick<LavorazioneSchedeBundle, "lavorazioni" | "ricambi"> {
  const bundle = buildCaptureSchedeBundle({
    lavorazioneId: input.lavorazioneId,
    fields: input.fields,
    createdBy: input.createdBy,
    includeLavorazioni: input.stages.includes("lavorazioni"),
    includeRicambi: input.stages.includes("ricambi"),
    schedaTipo: input.stages[0] ?? "lavorazioni",
    addettiRecords: input.addettiRecords,
    magazzino: input.magazzino,
  });
  return { lavorazioni: bundle.lavorazioni, ricambi: bundle.ricambi };
}

export function mergeCaptureBundlePatch(
  base: LavorazioneSchedeBundle,
  patch: Pick<LavorazioneSchedeBundle, "lavorazioni" | "ricambi">,
): LavorazioneSchedeBundle {
  return {
    ...base,
    lavorazioni: patch.lavorazioni ?? base.lavorazioni,
    ricambi: patch.ricambi ?? base.ricambi,
  };
}
