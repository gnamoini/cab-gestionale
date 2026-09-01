import { formatLavorazioneIngressoDisplay } from "@/lib/lavorazioni/lavorazione-ingresso-display";
import { resolveAuthorLabel } from "@/lib/auth/resolve-author-label";
import type { LogModificaAutoreSource } from "@/lib/gestionale-log/log-modifiche-view-model";
import type {
  LavorazioneSchedeBundle,
  SchedaIngressoDoc,
  SchedaLavorazioniDoc,
  SchedaRicambiDoc,
} from "@/types/schede";

export type LavorazioneUltimaModificaInfo = {
  iso: string;
  autore: string;
};

const USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isStoredUserId(value: string): boolean {
  return USER_ID_RE.test(value.trim());
}

/** Autore non risolto (UUID o fallback tecnico) — non mostrare in portale clienti. */
export function isUnresolvedLavorazioneAutore(autore: string): boolean {
  const t = autore.trim();
  if (!t || t === "—") return true;
  if (isStoredUserId(t)) return true;
  return t.startsWith("Utente ");
}

/** Portale clienti: omette UUID e placeholder tecnici. */
export function sanitizeClientPortalAutore(autore: string): string {
  return isUnresolvedLavorazioneAutore(autore) ? "" : autore.trim();
}

/** Etichetta leggibile per `updatedBy` / `createdBy` (nome, UUID profilo o fallback log). */
export function displayLavorazioneAutore(
  raw: string,
  autoreLog: string,
  resolveUserId?: (userId: string) => string | undefined,
): string {
  const t = raw.trim();
  if (!t) return autoreLog.trim() || "—";
  if (!isStoredUserId(t)) return t;
  const resolved = resolveUserId?.(t)?.trim();
  if (resolved) return resolved;
  const log = autoreLog.trim();
  if (log) return log;
  return `Utente ${t.slice(0, 8)}…`;
}

export type LavorazioneRowAutoreFields = {
  updated_at: string;
  created_at?: string | null;
  updated_by?: string | null;
  created_by?: string | null;
  updated_by_nome?: string | null;
  created_by_nome?: string | null;
};

export type ResolveLavorazioneUltimaModificaOptions = {
  /** @deprecated Fallback legacy: autore da batch globale log_modifiche. Preferire `updated_by` riga. */
  autoreLog?: string | null;
  /** Risolve UUID profilo (riga DB o schede). */
  resolveUserId?: (userId: string) => string | undefined;
  /** Portale clienti: non esporre UUID o fallback tecnico. */
  omitUnresolvedAutore?: boolean;
};

/** Resolver nomi profilo da join lista; viewer solo per etichetta «Tu». */
export function buildLavorazioneRowProfileResolver(
  row: LavorazioneRowAutoreFields,
  viewerId?: string | null,
  viewerDisplayName?: string | null,
): (userId: string) => string | undefined {
  return (userId: string) => {
    const id = userId.trim();
    if (!id) return undefined;
    if (row.updated_by === id && row.updated_by_nome?.trim()) return row.updated_by_nome.trim();
    if (row.created_by === id && row.created_by_nome?.trim()) return row.created_by_nome.trim();
    if (viewerId && id === viewerId) {
      const tu = resolveAuthorLabel({
        userId: id,
        viewerId,
        viewerDisplayName,
        unknownUserLabel: "",
      });
      return tu && tu !== "Utente" ? tu : viewerDisplayName?.trim() || "Tu";
    }
    return undefined;
  };
}

/** Estende resolver riga con nomi profilo da fetch lazy (mobile lista light). */
export function mergeLazyProfileNamesIntoResolver(
  base: (userId: string) => string | undefined,
  lazyNames: ReadonlyMap<string, string>,
): (userId: string) => string | undefined {
  return (userId: string) => {
    const fromBase = base(userId);
    if (fromBase) return fromBase;
    const id = userId.trim();
    return id ? lazyNames.get(id) : undefined;
  };
}

type SchedaDoc = SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;

/** Storico: in creazione `updatedBy` sulla scheda ingresso era l'addetto, non l'operatore. */
function schedaDocAutore(doc: SchedaDoc): string {
  const userId = doc.updatedByUserId?.trim();
  if (userId) return userId;
  const autore = doc.updatedBy?.trim() ?? "";
  if (!autore) return "";
  if (doc.tipo === "ingresso") {
    const addetto = doc.campi.addettoAccettazione?.trim() ?? "";
    if (addetto && autore === addetto && doc.updatedAt === doc.createdAt) return "";
  }
  return autore;
}

/** Stesso istante o stesso minuto mostrato in UI (row vs schede possono differire di ms). */
function sameUltimaModificaMoment(isoA: string, isoB: string): boolean {
  if (isoA === isoB) return true;
  const ta = new Date(isoA).getTime();
  const tb = new Date(isoB).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return false;
  if (ta === tb) return true;
  const da = formatLavorazioneIngressoDisplay(isoA);
  const db = formatLavorazioneIngressoDisplay(isoB);
  return da.date === db.date && da.time === db.time;
}

/**
 * Autore riga DB quando vince `updated_at`.
 * Priorità: updated_by → created_by (solo se create-only) → stringa vuota (fallback a log/schede).
 */
function rowDbAutoreRaw(row: LavorazioneRowAutoreFields): string {
  const updatedBy = row.updated_by?.trim() ?? "";
  if (updatedBy) return updatedBy;
  const createdAt = row.created_at?.trim() ?? "";
  if (createdAt && sameUltimaModificaMoment(row.updated_at, createdAt)) {
    const createdBy = row.created_by?.trim() ?? "";
    if (createdBy) return createdBy;
  }
  return "";
}

function resolveRawAutoreForUltimaModifica(
  candidates: readonly { iso: string; autore: string }[],
  bestIso: string,
  rowIso: string,
  rowAutoreRaw: string,
  autoreLog: string,
): string {
  if (sameUltimaModificaMoment(bestIso, rowIso)) {
    if (rowAutoreRaw.trim()) return rowAutoreRaw.trim();
    if (autoreLog) return autoreLog;
  }
  for (const c of candidates) {
    if (!sameUltimaModificaMoment(c.iso, bestIso)) continue;
    const autore = c.autore.trim();
    if (autore) return autore;
  }
  return "";
}

/**
 * Data/ora/autore più recenti tra riga DB e schede collegate.
 *
 * Autore quando vince la riga: updated_by → created_by (create-only) → autoreLog legacy → schede stesso momento.
 * Autore quando vince una scheda: updatedBy doc (regola ingresso-create) → displayLavorazioneAutore.
 */
export function resolveLavorazioneUltimaModifica(
  row: LavorazioneRowAutoreFields,
  bundle?: LavorazioneSchedeBundle | null,
  options?: ResolveLavorazioneUltimaModificaOptions,
): LavorazioneUltimaModificaInfo {
  const autoreLog = options?.autoreLog?.trim() ?? "";
  const resolveUserId = options?.resolveUserId;
  const rowAutoreRaw = rowDbAutoreRaw(row);
  const candidates: { iso: string; autore: string }[] = [{ iso: row.updated_at, autore: "" }];
  for (const doc of [bundle?.ingresso, bundle?.lavorazioni, bundle?.ricambi]) {
    if (!doc?.updatedAt?.trim()) continue;
    candidates.push({
      iso: doc.updatedAt,
      autore: schedaDocAutore(doc),
    });
  }
  const best = candidates.reduce((a, b) =>
    new Date(a.iso).getTime() >= new Date(b.iso).getTime() ? a : b,
  );
  const rawAutore = resolveRawAutoreForUltimaModifica(
    candidates,
    best.iso,
    row.updated_at,
    rowAutoreRaw,
    autoreLog,
  );
  let autore = displayLavorazioneAutore(rawAutore, autoreLog, resolveUserId);
  if (options?.omitUnresolvedAutore) {
    autore = sanitizeClientPortalAutore(autore);
  }
  return { iso: best.iso, autore };
}

export function formatLavorazioneUltimaModificaLine(info: LavorazioneUltimaModificaInfo): string {
  const { date, time } = formatLavorazioneIngressoDisplay(info.iso);
  const parts = [date, time, info.autore].filter((p) => p && p !== "—");
  return parts.length > 0 ? parts.join(" · ") : "—";
}

/** Card mobile: data · ora e autore su due righe (come magazzino). */
export function formatLavorazioneUltimaModificaMobileLines(info: LavorazioneUltimaModificaInfo): {
  dateTime: string;
  autore: string;
} {
  const { date, time } = formatLavorazioneIngressoDisplay(info.iso);
  const dateTime = [date, time].filter((p) => p && p !== "—").join(" · ");
  const autore = info.autore.trim() || "—";
  return { dateTime: dateTime || "—", autore };
}

/** Prima etichetta autore per `autore_id` (lista già ordinata per `created_at` desc). */
export function buildLogAutoreByUserId(
  rows: readonly LogModificaAutoreSource[],
  resolveAutore: (row: LogModificaAutoreSource) => string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const id = row.autore_id?.trim();
    if (!id || map.has(id)) continue;
    const label = resolveAutore(row).trim();
    if (!label || label.startsWith("Utente ")) continue;
    map.set(id, label);
  }
  return map;
}

/** Prima voce log per entità (lista già ordinata per `created_at` desc). */
export function buildLatestLogAutoreByEntitaId(
  rows: readonly LogModificaAutoreSource[],
  resolveAutore: (row: LogModificaAutoreSource) => string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (map.has(row.entita_id)) continue;
    const autore = resolveAutore(row).trim();
    if (autore) map.set(row.entita_id, autore);
  }
  return map;
}
