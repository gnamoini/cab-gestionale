import {
  formatStatoDisplay,
  formatTitleCasePhrase,
  imageLogModificaRiga,
  isImageLogAction,
  parseModificheLines,
  safeStr,
  type GestionaleLogEventTone,
} from "@/lib/gestionale-log/view-model";
import { formatLavorazioneLogOggettoLabel } from "@/lib/lavorazioni/lavorazione-log-oggetto";
import { statoLavorazioneLabel } from "@/lib/lavorazioni/stati-dynamic";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { parseMagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import {
  filterMagazzinoAutomaticModifiche,
  isMagazzinoAutomaticLogField,
  MAGAZZINO_CAMPO_LABEL,
} from "@/lib/magazzino/magazzino-log-events";

/** Summary persistito in `log_modifiche.payload.summary` (generato al write). */
export type LogModificaSummary = {
  tipoRiga: string;
  oggettoRiga: string;
  modifiche: string[];
  tone: GestionaleLogEventTone;
};

export type AuditLogContext = {
  /** Etichetta oggetto pre-calcolata (es. "Mario Rossi — Bobcat E35"). */
  oggetto?: string;
};

const SKIP_DIFF_KEYS = new Set([
  "updated_at",
  "created_at",
  "created_by",
  "id",
  "deleted_at",
  "undo_session_id",
  "autoreUltimaModifica",
  "autore_ultima_modifica",
  "dataUltimaModifica",
  "data_ultima_modifica",
]);

const FIELD_LABELS: Record<string, string> = {
  stato: "Stato",
  priorita: "Priorità",
  priorita_lavorazione: "Priorità",
  note: "Note",
  quantita: "Quantità",
  scorta: "Scorta",
  nome: "Nome",
  codice: "Codice",
  marca: "Marca",
  modello: "Modello",
  cliente: "Cliente",
  utilizzatore: "Utilizzatore",
  targa: "Targa",
  matricola: "Matricola",
  categoria: "Categoria",
  costo: "Costo",
  prezzo_vendita: "Prezzo vendita",
  consumo_medio_mensile: "Consumo medio",
  data_ingresso: "Data ingresso",
  data_uscita: "Data uscita",
  archived: "Archivio",
  archived_at: "Data archivio",
  mezzo_id: "Mezzo collegato",
  lavorazione_id: "Lavorazione collegata",
  totale: "Totale",
  dettagli: "Dettagli preventivo",
  url_file: "File",
  contenuto: "Contenuto scheda",
  tipo: "Tipo",
  numero_scuderia: "N. scuderia",
  tipo_attrezzatura: "Tipo attrezzatura",
  anno: "Anno",
  meta: "Dati aggiuntivi",
};

const MAGAZZINO_META_LOG_LABELS: Record<string, string> = {
  note: MAGAZZINO_CAMPO_LABEL.note ?? "Note",
  categoria: MAGAZZINO_CAMPO_LABEL.categoria ?? "Categoria",
  compatibilitaMezzi: MAGAZZINO_CAMPO_LABEL.compatibilitaMezzi ?? "Compatibilità",
  scortaMinima: MAGAZZINO_CAMPO_LABEL.scortaMinima ?? "Scorta minima",
  scontoFornitoreOriginale: MAGAZZINO_CAMPO_LABEL.scontoFornitoreOriginale ?? "Sconto OE %",
  fornitoreNonOriginale: MAGAZZINO_CAMPO_LABEL.fornitoreNonOriginale ?? "Fornitore alternativo",
  codiceFornitoreNonOriginale: MAGAZZINO_CAMPO_LABEL.codiceFornitoreNonOriginale ?? "Codice alternativo",
  prezzoFornitoreNonOriginale: MAGAZZINO_CAMPO_LABEL.prezzoFornitoreNonOriginale ?? "Prezzo alternativo",
  scontoFornitoreNonOriginale: MAGAZZINO_CAMPO_LABEL.scontoFornitoreNonOriginale ?? "Sconto alt. %",
};

function humanFieldLabel(key: string): string {
  const k = key.trim();
  if (FIELD_LABELS[k]) return FIELD_LABELS[k]!;
  return k
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isLogPlaceholderValue(s: string): boolean {
  const t = safeStr(s).trim();
  return !t || t === "—" || t === "–" || t === "-";
}

/** Rimuove segmenti vuoti/placeholder (—) dall'etichetta oggetto log. */
export function sanitizeLogOggettoRiga(raw: string): string {
  const s = safeStr(raw).trim();
  if (isLogPlaceholderValue(s)) return "—";
  const parts = s.split(/\s—\s/).map((p) => p.trim()).filter((p) => !isLogPlaceholderValue(p));
  return parts.length ? parts.join(" — ") : "—";
}

function joinOggetto(parts: string[]): string {
  return parts.map((p) => safeStr(p).trim()).filter((p) => !isLogPlaceholderValue(p)).join(" — ") || "—";
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") {
      const t = v.trim();
      if (!isLogPlaceholderValue(t)) return t;
    }
  }
  return "";
}

function nestedMezzo(obj: Record<string, unknown>): Record<string, unknown> | null {
  const m = obj.mezzo ?? obj.mezzi;
  if (m && typeof m === "object" && !Array.isArray(m)) return m as Record<string, unknown>;
  if (Array.isArray(m) && m[0] && typeof m[0] === "object") return m[0] as Record<string, unknown>;
  return null;
}

function recordFromPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  const ctx = p.context;
  if (ctx && typeof ctx === "object" && !Array.isArray(ctx)) {
    const oggetto = (ctx as Record<string, unknown>).oggetto;
    if (typeof oggetto === "string" && oggetto.trim()) {
      return { __oggetto: oggetto.trim() };
    }
  }
  const after = p.after;
  if (after && typeof after === "object" && !Array.isArray(after)) return after as Record<string, unknown>;
  const snap = p.snapshot;
  if (snap && typeof snap === "object" && !Array.isArray(snap)) return snap as Record<string, unknown>;
  const before = p.before;
  if (before && typeof before === "object" && !Array.isArray(before)) return before as Record<string, unknown>;
  return null;
}

export function entityKindLabel(entita: string): string {
  switch (entita) {
    case "lavorazioni":
      return "LAVORAZIONE";
    case "magazzino_ricambi":
      return "RICAMBIO";
    case "movimenti_ricambi":
      return "MOVIMENTO MAGAZZINO";
    case "mezzi":
      return "MEZZO";
    case "preventivi":
      return "PREVENTIVO";
    case "documenti":
      return "DOCUMENTO";
    case "scheda_lavorazione":
      return "SCHEDA LAVORAZIONE";
    case "profiles":
      return "PROFILO UTENTE";
    case "security":
      return "SICUREZZA";
    case "dipendenti":
      return "TIMESHEET DIPENDENTE";
    case "bunder_documents":
      return "DOCUMENTO BUNDER";
    default:
      return entita.replace(/_/g, " ").toUpperCase();
  }
}

export function tipoRigaFromAzione(entita: string, azione: string, payload?: unknown): string {
  if (isImageLogAction(azione)) return "CARICAMENTO FILE";
  if (entita === "movimenti_ricambi" && safeStr(azione).toUpperCase() === "CREATE") {
    const rec = payload ? recordFromPayload(payload as Record<string, unknown>) : null;
    const tipo = rec && typeof rec.tipo === "string" ? rec.tipo : "";
    if (tipo === "entrata") return "CARICO MAGAZZINO";
    if (tipo === "uscita") return "SCARICO MAGAZZINO";
  }
  const u = safeStr(azione).toUpperCase();
  const kind = entityKindLabel(entita);
  if (u === "CREATE") return `CREAZIONE ${kind}`;
  if (u === "UPDATE") return `AGGIORNAMENTO ${kind}`;
  if (u === "DELETE") return `ELIMINAZIONE ${kind}`;
  if (u === "RESTORE") return `RIPRISTINO ${kind}`;
  if (u === "REVERTED" || u === "UNDO") return "ANNULLAMENTO";
  if (u.includes("ARCHIV")) return `ARCHIVIAZIONE ${kind}`;
  if (u.includes("IMPOSTAZION") || entita === "app_settings") return "MODIFICA IMPOSTAZIONI";
  if (u.includes("PREVENTIV")) return `GENERAZIONE ${kind}`;
  if (u.includes("LOGIN") || u.includes("ACCESS")) return "ACCESSO";
  return `AGGIORNAMENTO ${kind}`;
}

export function toneFromAzione(azione: string, annullato?: boolean): GestionaleLogEventTone {
  if (annullato) return "neutral";
  if (isImageLogAction(azione)) return azione === "image_deleted" ? "delete" : "create";
  const u = safeStr(azione).toUpperCase();
  if (u === "CREATE" || u === "RESTORE") return "create";
  if (u === "DELETE") return "delete";
  if (u.includes("ARCHIV") || u === "CONCLUDE") return "archive";
  if (u.includes("COMPLET")) return "complete";
  return "update";
}

function buildOggettoFromRecord(entita: string, raw: Record<string, unknown>): string {
  if (typeof raw.__oggetto === "string") return raw.__oggetto;

  const mezzo = nestedMezzo(raw);

  switch (entita) {
    case "lavorazioni": {
      if (mezzo) {
        const oggetto = formatLavorazioneLogOggettoLabel({
          cliente: pickStr(mezzo, ["cliente"]),
          marca: pickStr(mezzo, ["marca"]),
          modello: pickStr(mezzo, ["modello"]),
          tipoAttrezzatura: pickStr(mezzo, ["tipo_attrezzatura"]),
        });
        if (oggetto !== "—") return oggetto;
      }
      return "Lavorazione";
    }
    case "magazzino_ricambi": {
      const nome = pickStr(raw, ["nome", "descrizione", "codice"]);
      const marca = pickStr(raw, ["marca"]);
      return joinOggetto([formatTitleCasePhrase(marca), formatTitleCasePhrase(nome)]);
    }
    case "mezzi": {
      const cliente = formatTitleCasePhrase(pickStr(raw, ["cliente"]));
      const ident = pickStr(raw, ["targa"]) || pickStr(raw, ["matricola"]) || pickStr(raw, ["codice"]);
      return joinOggetto([cliente, ident ? ident.toUpperCase() : ""]);
    }
    case "preventivi": {
      const det = raw.dettagli;
      const detObj = det && typeof det === "object" && !Array.isArray(det) ? (det as Record<string, unknown>) : {};
      const numero =
        pickStr(detObj, ["numero"]) ||
        (typeof raw.numero === "string" ? raw.numero : "") ||
        `PV-${pickStr(raw, ["id"]).slice(0, 8)}`;
      return joinOggetto([formatTitleCasePhrase(pickStr(raw, ["cliente"])), numero]);
    }
    case "documenti": {
      const meta = raw.meta;
      const metaObj = meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
      const nome = pickStr(metaObj, ["nome"]) || pickStr(raw, ["url_file"]).split("/").pop() || "Documento";
      const cat = pickStr(raw, ["categoria"]);
      return joinOggetto([nome, formatTitleCasePhrase(cat)]);
    }
    case "scheda_lavorazione":
      return `Scheda · ${pickStr(raw, ["tipo"]) || "lavorazione"}`;
    case "profiles":
      return formatTitleCasePhrase(pickStr(raw, ["nome", "email"]) || "Utente");
    case "bunder_documents": {
      const numero = pickStr(raw, ["numero_progressivo"]);
      const dest = formatTitleCasePhrase(pickStr(raw, ["azienda_destinatario"]));
      return joinOggetto([numero, dest]);
    }
    case "dipendenti": {
      const nome = formatTitleCasePhrase(pickStr(raw, ["employee_display_name_snapshot"]));
      const data = pickStr(raw, ["work_date"]);
      return joinOggetto([nome, data]);
    }
    default:
      return joinOggetto([pickStr(raw, ["nome", "codice", "descrizione", "marca"])]);
  }
}

function formatStatoForLog(raw: string, stati?: StatoLavorazioneConfig[]): string {
  const s = safeStr(raw).trim();
  if (!s || s === "—") return "—";
  if (stati?.length) return statoLavorazioneLabel(s, stati);
  return formatStatoDisplay(s);
}

function formatValueForField(key: string, value: unknown, stati?: StatoLavorazioneConfig[]): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (key === "stato") return formatStatoForLog(String(value), stati);
  if (key === "priorita" || key === "priorita_lavorazione") return formatTitleCasePhrase(String(value));
  if (typeof value === "object") return "aggiornato";
  const s = String(value).trim();
  return s.length > 120 ? `${s.slice(0, 117)}…` : s || "—";
}

export type PayloadFieldChange = { key: string; before: unknown; after: unknown };

/** Campi modificati da payload audit `{ before, after }`. */
export function extractPayloadFieldChanges(payload: unknown): PayloadFieldChange[] {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return [];
  const p = payload as Record<string, unknown>;
  const before = p.before;
  const after = p.after;
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const changes: PayloadFieldChange[] = [];
  for (const k of keys) {
    if (SKIP_DIFF_KEYS.has(k)) continue;
    if (JSON.stringify(b[k]) === JSON.stringify(a[k])) continue;
    changes.push({ key: k, before: b[k], after: a[k] });
    if (changes.length >= 12) break;
  }
  return changes;
}

export function modificaLineForFieldChange(
  change: PayloadFieldChange,
  stati?: StatoLavorazioneConfig[],
): string {
  return humanChangeSentence(change.key, change.before, change.after, stati);
}

function humanChangeSentence(
  key: string,
  before: unknown,
  after: unknown,
  stati?: StatoLavorazioneConfig[],
): string {
  const label = humanFieldLabel(key);
  const p = formatValueForField(key, before, stati);
  const d = formatValueForField(key, after, stati);

  if (key === "quantita" || key === "scorta") {
    const a = Number(before);
    const b = Number(after);
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      if (b > a) return `Quantità aumentata da ${a} a ${b}`;
      if (b < a) return `Quantità diminuita da ${a} a ${b}`;
    }
    return `Quantità aggiornata da ${p} a ${d}`;
  }
  if (key === "stato") return `Stato modificato da “${p}” a “${d}”`;
  if (key === "priorita" || key === "priorita_lavorazione") return `Priorità modificata da “${p}” a “${d}”`;
  if (key === "archived") return after ? "Spostata in archivio" : "Ripristinata tra le attive";
  if (before == null || before === "" || before === "—") return `${label} impostato a “${d}”`;
  if (after == null || after === "" || after === "—") return `${label} rimosso`;
  return `${label} modificato da “${p}” a “${d}”`;
}

const SCHEDA_CAMPO_LABELS: Record<string, string> = {
  addettoAccettazione: "Addetto accettazione",
  addetto: "Addetto",
  cliente: "Cliente",
  cantiere: "Cantiere",
  utilizzatore: "Utilizzatore",
  tipoAttrezzatura: "Tipo attrezzatura",
  marcaAttrezzatura: "Marca attrezzatura",
  modelloAttrezzatura: "Modello attrezzatura",
  matricola: "Matricola",
  nScuderia: "N. scuderia",
  targa: "Targa",
  dataIngresso: "Data ingresso",
  noteIntervento: "Note intervento",
  descrizioneAnomalia: "Descrizione anomalia",
  richiedente: "Richiedente",
};

const GENERIC_MODIFICA_LINES = new Set(["Modifica registrata", "Record aggiornato", "Dati aggiornati"]);

function isGenericModificaLines(modifiche: readonly string[]): boolean {
  return modifiche.length > 0 && modifiche.every((line) => GENERIC_MODIFICA_LINES.has(line.replace(/^•\s*/, "").trim()));
}

function oggettoFromPayloadContext(payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  const ctx = payload.context;
  if (!ctx || typeof ctx !== "object" || Array.isArray(ctx)) return "";
  return safeStr((ctx as Record<string, unknown>).oggetto).trim();
}

function unwrapSchedaContenutoCampi(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const root = raw as Record<string, unknown>;
  const doc = root.doc;
  if (doc && typeof doc === "object" && !Array.isArray(doc)) {
    const campi = (doc as Record<string, unknown>).campi;
    if (campi && typeof campi === "object" && !Array.isArray(campi)) {
      return campi as Record<string, unknown>;
    }
  }
  return root;
}

function formatMetaValueForLog(key: string, value: unknown): string {
  if (key === "compatibilitaMezzi" && Array.isArray(value)) {
    const parts = value.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return formatValueForField(key, value);
}

function diffMagazzinoMetaModifiche(before: unknown, after: unknown): string[] {
  const b = parseMagazzinoRicambioMeta(before);
  const a = parseMagazzinoRicambioMeta(after);
  const keys = new Set([
    ...Object.keys(MAGAZZINO_META_LOG_LABELS),
    ...Object.keys(b as object),
    ...Object.keys(a as object),
  ]);
  const lines: string[] = [];
  for (const key of keys) {
    if (isMagazzinoAutomaticLogField(key)) continue;
    const bv = (b as Record<string, unknown>)[key];
    const av = (a as Record<string, unknown>)[key];
    if (JSON.stringify(bv) === JSON.stringify(av)) continue;
    const label = MAGAZZINO_META_LOG_LABELS[key] ?? humanFieldLabel(key);
    const p = formatMetaValueForLog(key, bv);
    const d = formatMetaValueForLog(key, av);
    if (p === "—" || p === "") lines.push(`${label} impostato a “${d}”`);
    else if (d === "—" || d === "") lines.push(`${label} rimosso`);
    else lines.push(`${label} modificato da “${p}” a “${d}”`);
    if (lines.length >= 10) break;
  }
  return lines;
}

function diffContenutoSchedaModifiche(before: unknown, after: unknown): string[] {
  const b = unwrapSchedaContenutoCampi(before);
  const a = unwrapSchedaContenutoCampi(after);
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const lines: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(b[key]) === JSON.stringify(a[key])) continue;
    const label = SCHEDA_CAMPO_LABELS[key] ?? humanFieldLabel(key);
    const p = formatValueForField(key, b[key]);
    const d = formatValueForField(key, a[key]);
    if (p === "—" || p === "") lines.push(`${label} impostato a “${d}”`);
    else if (d === "—" || d === "") lines.push(`${label} rimosso`);
    else lines.push(`${label} modificato da “${p}” a “${d}”`);
    if (lines.length >= 8) break;
  }
  return lines;
}

function refreshGenericModifiche(
  modifiche: string[],
  payload: Record<string, unknown> | null,
  stati?: StatoLavorazioneConfig[],
): string[] {
  if (!payload || !isGenericModificaLines(modifiche)) return modifiche;
  const rediff = diffToModifiche(payload, stati);
  return rediff.length ? rediff : modifiche;
}

function resolveOggettoRiga(
  entita: string,
  oggettoRiga: string,
  payload: Record<string, unknown> | null,
): string {
  let resolved = oggettoRiga;
  const ctxOggetto = oggettoFromPayloadContext(payload);
  if (ctxOggetto && (resolved === "Lavorazione" || resolved === "—" || !resolved.trim())) {
    resolved = ctxOggetto;
  }
  if (entita === "lavorazioni" && resolved === "Lavorazione") {
    const record = payload ? recordFromPayload(payload) : null;
    if (record) {
      const rebuilt = buildOggettoFromRecord(entita, record);
      if (rebuilt !== "Lavorazione") resolved = rebuilt;
    }
  }
  return sanitizeLogOggettoRiga(resolved);
}

function filterModificheForDisplay(entita: string, lines: string[]): string[] {
  if (entita !== "magazzino_ricambi") return lines;
  return filterMagazzinoAutomaticModifiche(lines);
}

function diffToModifiche(
  payload: Record<string, unknown>,
  stati?: StatoLavorazioneConfig[],
  entita?: string,
): string[] {
  const lines: string[] = [];
  for (const change of extractPayloadFieldChanges(payload)) {
    if (change.key === "contenuto") {
      lines.push(...diffContenutoSchedaModifiche(change.before, change.after));
      continue;
    }
    if (change.key === "meta" && entita === "magazzino_ricambi") {
      const metaLines = diffMagazzinoMetaModifiche(change.before, change.after);
      if (metaLines.length) {
        lines.push(...metaLines);
        continue;
      }
    }
    lines.push(modificaLineForFieldChange(change, stati));
  }
  return entita ? filterModificheForDisplay(entita, lines) : lines;
}

const STATO_MODIFICATO_LINE_RE =
  /^Stato modificato da [“"]([^"”]+)[”"] a [“"]([^"”]+)[”"]$/i;
const STATO_INIZIALE_LINE_RE = /^Stato iniziale:\s*(.+)$/i;

function remapStatoModificaLineText(line: string, stati: StatoLavorazioneConfig[]): string {
  const bare = line.replace(/^•\s*/, "").trim();
  const mod = bare.match(STATO_MODIFICATO_LINE_RE);
  if (mod) {
    return `Stato modificato da “${formatStatoForLog(mod[1], stati)}” a “${formatStatoForLog(mod[2], stati)}”`;
  }
  const ini = bare.match(STATO_INIZIALE_LINE_RE);
  if (ini) {
    return `Stato iniziale: ${formatStatoForLog(ini[1].trim(), stati)}`;
  }
  return line;
}

/** Riscrive righe «Stato …» usando le etichette da impostazioni (anche su summary persistito). */
function remapLavorazioneStatoInModifiche(
  modifiche: string[],
  payload: unknown,
  stati?: StatoLavorazioneConfig[],
): string[] {
  if (!stati?.length) return modifiche;

  const statoChange =
    payload != null ? extractPayloadFieldChanges(payload).find((c) => c.key === "stato") : undefined;
  const fromPayload = statoChange
    ? humanChangeSentence("stato", statoChange.before, statoChange.after, stati)
    : null;

  let replacedFromPayload = false;
  return modifiche.map((m) => {
    const bare = m.replace(/^•\s*/, "").trim();
    if (/^Stato modificato da /i.test(bare) || /^Stato iniziale:/i.test(bare)) {
      if (fromPayload && !replacedFromPayload) {
        replacedFromPayload = true;
        return fromPayload;
      }
      return remapStatoModificaLineText(m, stati);
    }
    return m;
  });
}

function defaultModificheForCreate(
  entita: string,
  azione: string,
  record: Record<string, unknown> | null,
  stati?: StatoLavorazioneConfig[],
): string[] {
  const u = safeStr(azione).toUpperCase();
  if (u === "DELETE") return ["Record eliminato dal sistema"];
  if (u === "RESTORE") return ["Record ripristinato"];
  if (isImageLogAction(azione)) return [imageLogModificaRiga(azione)];

  if (u === "CREATE") {
    switch (entita) {
      case "lavorazioni": {
        const lines = ["Creata nuova lavorazione"];
        const stato = pickStr(record ?? {}, ["stato"]);
        if (stato) lines.push(`Stato iniziale: ${formatStatoForLog(stato, stati)}`);
        return lines;
      }
      case "magazzino_ricambi": {
        const nome = pickStr(record ?? {}, ["nome", "descrizione", "codice"]);
        const marca = pickStr(record ?? {}, ["marca"]);
        const label = joinOggetto([formatTitleCasePhrase(marca), formatTitleCasePhrase(nome)]);
        return label !== "—" ? [`Creato il ricambio ${label}`] : ["Nuovo ricambio creato in magazzino"];
      }
      case "movimenti_ricambi": {
        const tipo = pickStr(record ?? {}, ["tipo"]);
        const q = Number(record?.quantita);
        const qty = Number.isFinite(q) && q > 0 ? String(Math.round(q)) : "—";
        if (tipo === "entrata") return [`Carico magazzino: +${qty} pezzi`];
        if (tipo === "uscita") return [`Scarico magazzino: −${qty} pezzi`];
        return ["Movimento magazzino registrato"];
      }
      case "mezzi":
        return ["Nuovo mezzo registrato in anagrafica"];
      case "preventivi":
        return ["Creato nuovo preventivo"];
      case "documenti":
        return ["Documento caricato"];
      case "scheda_lavorazione":
        return ["Creata nuova scheda di lavorazione"];
      default:
        return ["Record creato"];
    }
  }
  return ["Modifica registrata"];
}

/** Genera summary leggibile da riga audit (write-time o read-time fallback). */
export function buildLogModificaSummary(input: {
  entita: string;
  entita_id: string;
  azione: string;
  payload?: unknown;
  annullato?: boolean;
  statiLavorazione?: StatoLavorazioneConfig[];
}): LogModificaSummary {
  const stati = input.entita === "lavorazioni" ? input.statiLavorazione : undefined;
  const payload =
    input.payload != null && typeof input.payload === "object" && !Array.isArray(input.payload)
      ? (input.payload as Record<string, unknown>)
      : null;

  const existing = payload?.summary;
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const s = existing as Record<string, unknown>;
    const tipoRiga = typeof s.tipoRiga === "string" ? s.tipoRiga : "";
    const oggettoRiga = typeof s.oggettoRiga === "string" ? s.oggettoRiga : "";
    const modifiche = Array.isArray(s.modifiche) ? s.modifiche.filter((x) => typeof x === "string") : [];
    if (tipoRiga && oggettoRiga && modifiche.length) {
      const resolvedOggetto = resolveOggettoRiga(input.entita, oggettoRiga, payload);
      let resolvedModifiche =
        input.entita === "lavorazioni"
          ? remapLavorazioneStatoInModifiche(modifiche as string[], payload, stati)
          : filterModificheForDisplay(input.entita, modifiche as string[]);
      resolvedModifiche = refreshGenericModifiche(resolvedModifiche, payload, stati);
      if (resolvedModifiche.length === 0 && input.entita === "magazzino_ricambi") {
        resolvedModifiche = defaultModificheForCreate(input.entita, input.azione, recordFromPayload(payload), stati);
      }
      return {
        tipoRiga,
        oggettoRiga: resolvedOggetto,
        modifiche: resolvedModifiche,
        tone: toneFromAzione(input.azione, input.annullato),
      };
    }
  }

  if (typeof payload?.compact === "string" && payload.compact.trim()) {
    let modifiche = payload.compact
      .trim()
      .split(/\s·\s/)
      .map((part) => part.replace(/^•\s*/, "").trim())
      .filter(Boolean);
    if (input.entita === "lavorazioni" && stati?.length) {
      modifiche = remapLavorazioneStatoInModifiche(modifiche, payload, stati);
    }
    return {
      tipoRiga: tipoRigaFromAzione(input.entita, input.azione, payload),
      oggettoRiga: buildOggettoFromRecord(input.entita, recordFromPayload(payload) ?? {}),
      modifiche: modifiche.length ? modifiche : [payload.compact.trim()],
      tone: toneFromAzione(input.azione, input.annullato),
    };
  }

  const record = payload ? recordFromPayload(payload) : null;
  const oggettoRiga = resolveOggettoRiga(input.entita, record ? buildOggettoFromRecord(input.entita, record) : "—", payload);
  let modifiche = payload ? diffToModifiche(payload, stati, input.entita) : [];

  if (modifiche.length === 0) {
    modifiche = defaultModificheForCreate(input.entita, input.azione, record, stati);
  } else if (input.entita === "magazzino_ricambi") {
    modifiche = filterMagazzinoAutomaticModifiche(modifiche);
    if (modifiche.length === 0) {
      modifiche = defaultModificheForCreate(input.entita, input.azione, record, stati);
    }
  }

  if (input.entita === "magazzino_ricambi" && safeStr(input.azione).toUpperCase() === "DELETE") {
    const nome = record ? joinOggetto([formatTitleCasePhrase(pickStr(record, ["marca"])), formatTitleCasePhrase(pickStr(record, ["nome", "codice"]))]) : "";
    if (nome !== "—") modifiche = [`Eliminato il ricambio ${nome}`];
    else modifiche = ["Ricambio eliminato dal magazzino"];
  }

  if (input.annullato) {
    modifiche = ["Modifica annullata"];
  }

  return {
    tipoRiga: input.annullato ? "OPERAZIONE ANNULLATA" : tipoRigaFromAzione(input.entita, input.azione, payload),
    oggettoRiga,
    modifiche,
    tone: toneFromAzione(input.azione, input.annullato),
  };
}

export function modificheToModificaRiga(modifiche: string[]): string {
  return modifiche.map((m) => `• ${m.replace(/^•\s*/, "")}`).join("\n");
}

export { parseModificheLines };

export function auditContext(oggetto: string): AuditLogContext {
  return { oggetto: oggetto.trim() };
}

export function mergePayloadWithSummary(
  payload: unknown,
  summary: LogModificaSummary,
): Record<string, unknown> {
  const base =
    payload != null && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : payload != null
        ? { data: payload }
        : {};
  return {
    ...base,
    summary,
    compact: modificheToModificaRiga(summary.modifiche).replace(/\n/g, " · "),
  };
}
