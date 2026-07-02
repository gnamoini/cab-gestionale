import { findMezzoByIngressoIdent } from "@/lib/mezzi/find-mezzo-by-ident";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoDoc, SchedaIngressoFields } from "@/types/schede";

function normIdent(v: string): string {
  return v.trim().toLowerCase();
}

function normScuderia(v: string): string {
  const n = normIdent(v);
  if (!n || n === "—") return "";
  return n;
}

/** Targa, matricola o n. scuderia valorizzati per lookup ultima scheda. */
export function hasSchedaIngressoIdentLookup(
  targa: string,
  matricola: string,
  nScuderia = "",
): boolean {
  const t = normIdent(targa);
  const m = normIdent(matricola);
  const s = normScuderia(nScuderia);
  if (s) return true;
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

function sameScuderia(a: { nScuderia?: string }, b: { nScuderia?: string }): boolean {
  const na = normScuderia(a.nScuderia ?? "");
  const nb = normScuderia(b.nScuderia ?? "");
  return Boolean(na && nb && na === nb);
}

import {
  copySchedaIngressoFieldFromClient,
  isSchedaIngressoFieldEmpty,
} from "@/lib/schede/scheda-ingresso-typed-fields";
const INGRESSO_FIELDS_NEVER_COPY: ReadonlySet<keyof SchedaIngressoFields> = new Set(["dataIngresso"]);

export type LastSchedaIngressoMatch = {
  campi: SchedaIngressoFields;
  sourceLavorazioneId: string;
  updatedAt: string;
};

function collectLavorazioneIdsForIdent(
  targa: string,
  matricola: string,
  nScuderia: string,
  mezzi: readonly MezzoGestito[],
  lavorazioni: readonly (LavorazioneAttiva | LavorazioneArchiviata)[],
  excludeLavorazioneId?: string,
): string[] {
  if (!hasSchedaIngressoIdentLookup(targa, matricola, nScuderia)) return [];

  const ident = { targa, matricola, nScuderia };
  const mezzo = findMezzoByIngressoIdent(mezzi, ident);
  const ids = new Set<string>();

  for (const lav of lavorazioni) {
    if (excludeLavorazioneId && lav.id === excludeLavorazioneId) continue;
    if (sameTargaOrMatricola(ident, lav)) ids.add(lav.id);
    else if (sameScuderia(ident, lav)) ids.add(lav.id);
    else if (mezzo && lavorazioneMatchesMezzo(mezzo, lav)) ids.add(lav.id);
  }
  return [...ids];
}

function collectSchedaIngressoMatches(
  lavIds: readonly string[],
  schedeStore: LavorazioneSchedeStore,
): LastSchedaIngressoMatch[] {
  const out: LastSchedaIngressoMatch[] = [];

  for (const id of lavIds) {
    const ing: SchedaIngressoDoc | null | undefined = schedeStore[id]?.ingresso;
    if (!ing || ing.sorgente === "file_esterno") continue;
    out.push({
      campi: { ...ing.campi },
      sourceLavorazioneId: id,
      updatedAt: ing.updatedAt,
    });
  }

  out.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return out;
}

/** Tutte le schede ingresso corrispondenti, ordinate dalla più recente. */
export function listSchedaIngressoMatchesForIdent(
  targa: string,
  matricola: string,
  nScuderia: string,
  mezzi: readonly MezzoGestito[],
  schedeStore: LavorazioneSchedeStore,
  attive: readonly LavorazioneAttiva[],
  storico: readonly LavorazioneArchiviata[],
  options?: { excludeLavorazioneId?: string },
): LastSchedaIngressoMatch[] {
  const lavIds = collectLavorazioneIdsForIdent(
    targa,
    matricola,
    nScuderia,
    mezzi,
    [...attive, ...storico],
    options?.excludeLavorazioneId,
  );
  if (lavIds.length === 0) return [];
  return collectSchedaIngressoMatches(lavIds, schedeStore);
}

/**
 * Ultima scheda ingresso compilabile per ident (targa / matricola / scuderia o mezzo collegato).
 * @deprecated Preferire `copyLastSchedaIngresso` da `@/lib/domain/scheda-ingresso/copy-last-scheda`.
 */
export function findLastSchedaIngressoForIdent(
  targa: string,
  matricola: string,
  mezzi: readonly MezzoGestito[],
  schedeStore: LavorazioneSchedeStore,
  attive: readonly LavorazioneAttiva[],
  storico: readonly LavorazioneArchiviata[],
  options?: { excludeLavorazioneId?: string; nScuderia?: string },
): LastSchedaIngressoMatch | null {
  const nScuderia = options?.nScuderia ?? "";
  const matches = listSchedaIngressoMatchesForIdent(
    targa,
    matricola,
    nScuderia,
    mezzi,
    schedeStore,
    attive,
    storico,
    options?.excludeLavorazioneId
      ? { excludeLavorazioneId: options.excludeLavorazioneId }
      : undefined,
  );
  return matches[0] ?? null;
}

/** Precompila solo i campi ancora vuoti; non tocca data ingresso né valori già digitati. */
export function mergeSchedaIngressoFields(
  current: SchedaIngressoFields,
  source: SchedaIngressoFields,
): SchedaIngressoFields {
  const next = { ...current };
  for (const key of Object.keys(source) as (keyof SchedaIngressoFields)[]) {
    if (INGRESSO_FIELDS_NEVER_COPY.has(key)) continue;
    if (isSchedaIngressoFieldEmpty(key, next[key])) {
      copySchedaIngressoFieldFromClient(next, source, key);
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

/** Etichetta sintetica per scelta tra più schede ingresso. */
export function describeSchedaIngressoMatchLabel(match: LastSchedaIngressoMatch): string {
  const c = match.campi;
  const parts: string[] = [];
  const cliente = c.cliente.trim();
  if (cliente) parts.push(cliente);
  const identBits = [c.targa, c.matricola, c.nScuderia]
    .map((v) => v.trim())
    .filter((v) => v && v !== "—");
  if (identBits.length) parts.push(identBits.join(" · "));
  const dataIng = c.dataIngresso.trim();
  if (dataIng) parts.push(`ingresso ${dataIng}`);
  parts.push(formatLastSchedaIngressoHint(match.updatedAt));
  return parts.join(" — ");
}
