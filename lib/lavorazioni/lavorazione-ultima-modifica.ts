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

export type ResolveLavorazioneUltimaModificaOptions = {
  /** Autore dell'ultima voce `log_modifiche` per la lavorazione (operatore di sistema). */
  autoreLog?: string | null;
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
  const autore = best.autore || autoreLog || "—";
  return { iso: best.iso, autore };
}

export function formatLavorazioneUltimaModificaLine(info: LavorazioneUltimaModificaInfo): string {
  const { date, time } = formatLavorazioneIngressoDisplay(info.iso);
  const parts = [date, time, info.autore].filter((p) => p && p !== "—");
  return parts.length > 0 ? parts.join(" · ") : "—";
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
