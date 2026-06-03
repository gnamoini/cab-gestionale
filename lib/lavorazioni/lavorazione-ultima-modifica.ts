import { formatLavorazioneIngressoDisplay } from "@/lib/lavorazioni/lavorazione-ingresso-display";
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

export type ResolveLavorazioneUltimaModificaOptions = {
  /** Autore dell'ultima voce `log_modifiche` per la lavorazione (operatore di sistema). */
  autoreLog?: string | null;
  /** Risolve `updatedBy` salvati come UUID profilo (es. da log `profiles.nome`). */
  resolveUserId?: (userId: string) => string | undefined;
};

type SchedaDoc = SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;

/** Storico: in creazione `updatedBy` sulla scheda ingresso era l'addetto, non l'operatore. */
function schedaDocAutore(doc: SchedaDoc): string {
  const autore = doc.updatedBy?.trim() ?? "";
  if (!autore) return "";
  if (doc.tipo === "ingresso") {
    const addetto = doc.campi.addettoAccettazione?.trim() ?? "";
    if (addetto && autore === addetto && doc.updatedAt === doc.createdAt) return "";
  }
  return autore;
}

/** Data/ora/autore più recenti tra riga DB e schede collegate. */
export function resolveLavorazioneUltimaModifica(
  row: { updated_at: string },
  bundle?: LavorazioneSchedeBundle | null,
  options?: ResolveLavorazioneUltimaModificaOptions,
): LavorazioneUltimaModificaInfo {
  const autoreLog = options?.autoreLog?.trim() ?? "";
  const candidates: { iso: string; autore: string; fromRow: boolean }[] = [
    { iso: row.updated_at, autore: autoreLog, fromRow: true },
  ];
  for (const doc of [bundle?.ingresso, bundle?.lavorazioni, bundle?.ricambi]) {
    if (!doc?.updatedAt?.trim()) continue;
    candidates.push({
      iso: doc.updatedAt,
      autore: schedaDocAutore(doc),
      fromRow: false,
    });
  }
  const best = candidates.reduce((a, b) =>
    new Date(a.iso).getTime() >= new Date(b.iso).getTime() ? a : b,
  );
  const autore = displayLavorazioneAutore(best.autore || autoreLog, autoreLog, options?.resolveUserId);
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
