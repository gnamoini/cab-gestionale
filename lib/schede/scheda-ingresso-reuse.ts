import { findMezzoByIngressoIdent } from "@/lib/mezzi/find-mezzo-by-ident";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { schedaIngressoCampiMatchIdent } from "@/lib/schede/scheda-ingresso-ident-match";
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

import {
  copySchedaIngressoFieldFromClient,
  isSchedaIngressoFieldEmpty,
} from "@/lib/schede/scheda-ingresso-typed-fields";
const INGRESSO_FIELDS_NEVER_COPY: ReadonlySet<keyof SchedaIngressoFields> = new Set([
  "dataIngresso",
  "richiedenteFirma",
  "addettoFirma",
]);

export type LastSchedaIngressoMatch = {
  campi: SchedaIngressoFields;
  sourceLavorazioneId: string;
  updatedAt: string;
};

function collectSchedaIngressoMatchesInStore(
  targa: string,
  matricola: string,
  nScuderia: string,
  schedeStore: LavorazioneSchedeStore,
  excludeLavorazioneId?: string,
): LastSchedaIngressoMatch[] {
  if (!hasSchedaIngressoIdentLookup(targa, matricola, nScuderia)) return [];

  const ident = { targa, matricola, nScuderia };
  const out: LastSchedaIngressoMatch[] = [];

  for (const [lavId, bundle] of Object.entries(schedeStore)) {
    if (excludeLavorazioneId && lavId === excludeLavorazioneId) continue;
    const ing: SchedaIngressoDoc | null | undefined = bundle?.ingresso;
    if (!ing || ing.sorgente === "file_esterno") continue;
    if (!schedaIngressoCampiMatchIdent(ing.campi, ident)) continue;
    out.push({
      campi: { ...ing.campi },
      sourceLavorazioneId: lavId,
      updatedAt: ing.updatedAt,
    });
  }

  out.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return out;
}

/** Mezzo presente in anagrafica mezzi per targa / matricola / scuderia. */
export function isIngressoIdentInMezziAnagrafica(
  mezzi: readonly MezzoGestito[],
  targa: string,
  matricola: string,
  nScuderia = "",
): boolean {
  if (!hasSchedaIngressoIdentLookup(targa, matricola, nScuderia)) return false;
  return findMezzoByIngressoIdent(mezzi, { targa, matricola, nScuderia }) != null;
}

/** Tutte le schede ingresso corrispondenti, ordinate dalla più recente. */
export function listSchedaIngressoMatchesForIdent(
  targa: string,
  matricola: string,
  nScuderia: string,
  _mezzi: readonly MezzoGestito[],
  schedeStore: LavorazioneSchedeStore,
  _attive: readonly LavorazioneAttiva[],
  _storico: readonly LavorazioneArchiviata[],
  options?: { excludeLavorazioneId?: string },
): LastSchedaIngressoMatch[] {
  return collectSchedaIngressoMatchesInStore(
    targa,
    matricola,
    nScuderia,
    schedeStore,
    options?.excludeLavorazioneId,
  );
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
