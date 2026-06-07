import { dbTipoToBundleKey } from "@/lib/schede/scheda-tipo-db-mapper";

function schedaDocFromContenuto(contenuto: unknown): unknown {
  if (!contenuto || typeof contenuto !== "object" || Array.isArray(contenuto)) return null;
  const c = contenuto as Record<string, unknown>;
  if ("doc" in c && c.doc && typeof c.doc === "object" && !Array.isArray(c.doc)) {
    return c.doc;
  }
  return c;
}

function pushTrimmedName(out: Set<string>, raw: unknown): void {
  if (typeof raw !== "string") return;
  const t = raw.trim();
  if (t && t !== "—") out.add(t);
}

/** Estrae nomi addetto da una riga `scheda_lavorazione` (contenuto DB). */
export function collectAddettiNamesFromSchedaContenuto(tipo: string, contenuto: unknown): string[] {
  const names = new Set<string>();
  const bundleKey = dbTipoToBundleKey(tipo);
  const doc = schedaDocFromContenuto(contenuto);
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return [];

  const d = doc as Record<string, unknown>;

  if (bundleKey === "ingresso") {
    const campi = d.campi;
    if (campi && typeof campi === "object" && !Array.isArray(campi)) {
      pushTrimmedName(names, (campi as Record<string, unknown>).addettoAccettazione);
    }
    return [...names];
  }

  if (bundleKey === "lavorazioni") {
    const campi = d.campi;
    if (!campi || typeof campi !== "object" || Array.isArray(campi)) return [];
    const righe = (campi as Record<string, unknown>).righe;
    if (!Array.isArray(righe)) return [];
    for (const riga of righe) {
      if (!riga || typeof riga !== "object" || Array.isArray(riga)) continue;
      const addettiAssegnati = (riga as Record<string, unknown>).addettiAssegnati;
      if (!Array.isArray(addettiAssegnati)) continue;
      for (const entry of addettiAssegnati) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
        pushTrimmedName(names, (entry as Record<string, unknown>).addetto);
      }
    }
  }

  return [...names];
}

export type AddettiInUsoPartition = {
  attivi: string[];
  storico: string[];
};

/** Aggrega nomi addetto per lavorazioni attive vs archiviate. */
export function partitionAddettiInUso(
  lavorazioni: ReadonlyArray<{ id: string; archived: boolean | null | undefined }>,
  schede: ReadonlyArray<{ lavorazione_id: string; tipo: string; contenuto: unknown }>,
): AddettiInUsoPartition {
  const archivedByLav = new Map(lavorazioni.map((l) => [l.id, l.archived === true]));
  const attiviSet = new Set<string>();
  const storicoSet = new Set<string>();

  for (const row of schede) {
    const isStorico = archivedByLav.get(row.lavorazione_id) === true;
    const target = isStorico ? storicoSet : attiviSet;
    for (const name of collectAddettiNamesFromSchedaContenuto(row.tipo, row.contenuto)) {
      target.add(name);
    }
  }

  return {
    attivi: [...attiviSet].sort((a, b) => a.localeCompare(b, "it")),
    storico: [...storicoSet].sort((a, b) => a.localeCompare(b, "it")),
  };
}
