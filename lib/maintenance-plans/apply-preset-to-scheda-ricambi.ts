import type { EffectivePart } from "@/lib/maintenance-plans/resolve-effective-preset";
import type { RigaRicambioScheda } from "@/types/schede";

export function presetPartsToSchedaRighe(parts: EffectivePart[]): RigaRicambioScheda[] {
  return parts.map((p, idx) => ({
    id: `preset-${p.ricambioId}-${idx}`,
    ricambioId: p.ricambioId,
    ricambioNome: p.descrizione,
    codice: p.codice,
    quantita: p.quantita,
    addetto: "",
    dataUtilizzo: "",
    scaricoMagazzinoApplicato: false,
    scaricoMagazzinoRichiesto: false,
  }));
}

export function mergePresetRigheWithUserModified(
  incoming: RigaRicambioScheda[],
  existing: RigaRicambioScheda[],
  userModifiedIds: Set<string>,
): RigaRicambioScheda[] {
  const existingByRicambio = new Map(
    existing.filter((r) => r.ricambioId).map((r) => [r.ricambioId as string, r]),
  );
  return incoming.map((row) => {
    if (!row.ricambioId) return row;
    const prev = existingByRicambio.get(row.ricambioId);
    if (prev && userModifiedIds.has(prev.id)) return prev;
    return row;
  });
}
