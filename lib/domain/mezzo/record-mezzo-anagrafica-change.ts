import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";

export type MezzoAnagraficaHistoryOrigine =
  | "scheda_ingresso"
  | "modifica_manuale"
  | "import_ai"
  | "migrazione";

/** Solo rendering, filtri e audit — non usare per logica di business. */
export type MezzoAnagraficaHistoryEventKind = "anagrafica_change" | "association_change";

export type MezzoAnagraficaHistoryInsert = {
  mezzo_id: string;
  lavorazione_id?: string | null;
  scheda_id?: string | null;
  user_id?: string | null;
  origine: MezzoAnagraficaHistoryOrigine;
  changed_fields: MezzoPermanentFieldKey[];
  old_values: Record<string, string>;
  new_values: Record<string, string>;
  event_kind?: MezzoAnagraficaHistoryEventKind;
  reason?: string | null;
};

export function diffMezzoAnagraficaHistory(
  oldValues: Record<string, string>,
  newValues: Record<string, string>,
): {
  changed_fields: MezzoPermanentFieldKey[];
  old_values: Record<string, string>;
  new_values: Record<string, string>;
} {
  const changed_fields: MezzoPermanentFieldKey[] = [];
  const oldOut: Record<string, string> = {};
  const newOut: Record<string, string> = {};
  const keys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
  for (const key of keys) {
    const a = String(oldValues[key] ?? "").trim();
    const b = String(newValues[key] ?? "").trim();
    if (a === b) continue;
    changed_fields.push(key as MezzoPermanentFieldKey);
    oldOut[key] = a || "—";
    newOut[key] = b || "—";
  }
  return { changed_fields, old_values: oldOut, new_values: newOut };
}
