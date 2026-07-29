import type { RicambioCompatRef } from "@/lib/magazzino/ricambio-compat-resolver";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

/** Segnaposto legacy in DB/form — non è una compatibilità reale. */
export const RICAMBIO_COMPAT_LEGACY_PLACEHOLDER = "—";

export type CompatInput = Pick<RicambioMagazzino, "compatibilitaRefs" | "compatibilitaMezzi">;

/** Risultato normalizzato unico per UI, export, search, sort. */
export type ResolvedCompatibilita = {
  /** Source of truth (da meta o derivato al save). */
  refs: RicambioCompatRef[];
  /** Etichette canoniche «Marca — Modello» / «Marca — ». */
  labels: string[];
  /** Righe display UI: «Marca (universale)» / «Marca Modello». */
  displayLines: string[];
  /** Testo display joinato per tabelle/detail. */
  display: string;
  sortKey: string;
  /** Nessun ref né legacy in input — compatibilità non configurata. */
  isUniversal: boolean;
  /** Almeno un ref o legacy presente in meta. */
  isConfigured: boolean;
  /** Refs non risolvibili o label legacy residue safe. */
  orphanLabels: string[];
};
