import { findMezzoByTargaOrMatricola } from "@/lib/mezzi/find-mezzo-by-ident";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoDoc, SchedaIngressoFields } from "@/types/schede";

function normIdent(v: string): string {
  return v.trim().toLowerCase();
}

/** Targa o matricola valorizzata per lookup. */
export function hasSchedaIngressoIdentLookup(targa: string, matricola: string): boolean {
  const t = normIdent(targa);
  const m = normIdent(matricola);
  if (t && t !== "—") return true;
  if (m && m !== "non assegnata" && m !== "—") return true;
  return false;
}

function sameTargaOrMatricola(
  a: { targa: string; matricola: string },
  b: { targa: string; matricola: string },
): boolean {
  const ta = normIdent(a.targa);
  const tb = normIdent(b.targa);
  if (ta && tb && ta !== "—" && ta === tb) return true;
  const ma = normIdent(a.matricola);
  const mb = normIdent(b.matricola);
  if (ma && mb && ma !== "non assegnata" && ma !== "—" && ma === mb) return true;
  return false;
}

function isIngressoFieldEmpty(key: keyof SchedaIngressoFields, value: string): boolean {
  if (key === "dataIngresso") return false;
  const t = value.trim();
  if (!t) return true;
  if (t === "—") return true;
  if (key === "matricola" && t.toLowerCase() === "non assegnata") return true;
  return false;
}

/** Campi da non copiare dalla scheda precedente (nuovo ingresso). */
const INGRESSO_FIELDS_NEVER_COPY: ReadonlySet<keyof SchedaIngressoFields> = new Set(["dataIngresso"]);

export type LastSchedaIngressoMatch = {
  campi: SchedaIngressoFields;
  sourceLavorazioneId: string;
  updatedAt: string;
};

function collectLavorazioneIdsForIdent(
  targa: string,
  matricola: string,
  mezzi: readonly MezzoGestito[],
  lavorazioni: readonly (LavorazioneAttiva | LavorazioneArchiviata)[],
  excludeLavorazioneId?: string,
): string[] {
  const ident = { targa, matricola };
  if (!hasSchedaIngressoIdentLookup(targa, matricola)) return [];

  const mezzo = findMezzoByTargaOrMatricola(mezzi, targa, matricola);
  const ids = new Set<string>();

  for (const lav of lavorazioni) {
    if (excludeLavorazioneId && lav.id === excludeLavorazioneId) continue;
    if (sameTargaOrMatricola(ident, lav)) ids.add(lav.id);
    else if (mezzo && lavorazioneMatchesMezzo(mezzo, lav)) ids.add(lav.id);
  }
  return [...ids];
}

/** Ultima scheda ingresso compilabile per targa/matricola (o mezzo collegato). */
export function findLastSchedaIngressoForIdent(
  targa: string,
  matricola: string,
  mezzi: readonly MezzoGestito[],
  schedeStore: LavorazioneSchedeStore,
  attive: readonly LavorazioneAttiva[],
  storico: readonly LavorazioneArchiviata[],
  options?: { excludeLavorazioneId?: string },
): LastSchedaIngressoMatch | null {
  const lavIds = collectLavorazioneIdsForIdent(
    targa,
    matricola,
    mezzi,
    [...attive, ...storico],
    options?.excludeLavorazioneId,
  );
  if (lavIds.length === 0) return null;

  let best: { campi: SchedaIngressoFields; sourceLavorazioneId: string; updatedAt: string } | null = null;

  for (const id of lavIds) {
    const ing: SchedaIngressoDoc | null | undefined = schedeStore[id]?.ingresso;
    if (!ing || ing.sorgente === "file_esterno") continue;
    const t = new Date(ing.updatedAt).getTime();
    if (!best || t > new Date(best.updatedAt).getTime()) {
      best = {
        campi: ing.campi,
        sourceLavorazioneId: id,
        updatedAt: ing.updatedAt,
      };
    }
  }

  return best;
}

/** Precompila solo i campi ancora vuoti; non tocca data ingresso né valori già digitati. */
export function mergeSchedaIngressoFields(
  current: SchedaIngressoFields,
  source: SchedaIngressoFields,
): SchedaIngressoFields {
  const next = { ...current };
  for (const key of Object.keys(source) as (keyof SchedaIngressoFields)[]) {
    if (INGRESSO_FIELDS_NEVER_COPY.has(key)) continue;
    if (isIngressoFieldEmpty(key, next[key])) {
      next[key] = source[key];
    }
  }
  return next;
}

export function formatLastSchedaIngressoHint(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
