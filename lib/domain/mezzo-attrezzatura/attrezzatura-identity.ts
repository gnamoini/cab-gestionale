import type { AttrezzaturaRow } from "@/src/types/supabase-tables";

const PLACEHOLDER = "—";

export function normMatricola(matricola: string | null | undefined): string | null {
  const t = matricola?.trim();
  return t && t.length > 0 ? t.toLowerCase() : null;
}

export function isPlaceholderMarcaModello(value: string | null | undefined): boolean {
  const t = value?.trim();
  return !t || t === PLACEHOLDER;
}

/** Riga vuota tecnica: solo mezzo_id, nessun dato anagrafico reale. */
export function isAttrezzaturaEmptyShell(row: AttrezzaturaRow): boolean {
  if (row.matricola?.trim()) return false;
  if (row.tipo_attrezzatura?.trim()) return false;
  if (row.portata?.trim()) return false;
  if (row.anno != null) return false;
  if (row.note?.trim()) return false;
  if (!isPlaceholderMarcaModello(row.marca)) return false;
  if (!isPlaceholderMarcaModello(row.modello)) return false;
  return true;
}

export function countAnagraficaFields(row: AttrezzaturaRow): number {
  let n = 0;
  if (row.tipo_attrezzatura?.trim()) n++;
  if (row.matricola?.trim()) n++;
  if (row.portata?.trim()) n++;
  if (row.anno != null) n++;
  if (row.note?.trim()) n++;
  if (!isPlaceholderMarcaModello(row.marca)) n++;
  if (!isPlaceholderMarcaModello(row.modello)) n++;
  return n;
}

/** Priorità: tipo valorizzato > più campi > più vecchio. */
export function pickCanonicalAttrezzatura(rows: readonly AttrezzaturaRow[]): AttrezzaturaRow {
  if (rows.length === 0) throw new Error("pickCanonicalAttrezzatura: empty");
  if (rows.length === 1) return rows[0]!;
  return [...rows].sort((a, b) => {
    const aTipo = a.tipo_attrezzatura?.trim() ? 1 : 0;
    const bTipo = b.tipo_attrezzatura?.trim() ? 1 : 0;
    if (bTipo !== aTipo) return bTipo - aTipo;
    const aFields = countAnagraficaFields(a);
    const bFields = countAnagraficaFields(b);
    if (bFields !== aFields) return bFields - aFields;
    return a.created_at.localeCompare(b.created_at);
  })[0]!;
}

export function filterNullMatricolaRows(rows: readonly AttrezzaturaRow[]): AttrezzaturaRow[] {
  return rows.filter((r) => !r.matricola?.trim());
}

export type UpgradeCandidateResult =
  | { kind: "candidate"; row: AttrezzaturaRow }
  | { kind: "none" }
  | { kind: "ambiguous"; reason: string };

/** Candidato upgrade quando incoming ha matricola ma DB non ha match per identity. */
export function findUpgradeCandidateByMissingIdentity(
  nullMatricolaRows: readonly AttrezzaturaRow[],
  incomingHasMatricola: boolean,
): UpgradeCandidateResult {
  if (!incomingHasMatricola) return { kind: "none" };
  if (nullMatricolaRows.length === 0) return { kind: "none" };
  if (nullMatricolaRows.length === 1) return { kind: "candidate", row: nullMatricolaRows[0]! };

  const shells = nullMatricolaRows.filter(isAttrezzaturaEmptyShell);
  if (shells.length === 1) return { kind: "candidate", row: shells[0]! };

  return {
    kind: "ambiguous",
    reason: "multiple_null_matricola_without_unique_empty_shell",
  };
}

export function matricolaRowsForNorm(
  rows: readonly AttrezzaturaRow[],
  mezzoId: string,
  matricolaNorm: string,
): AttrezzaturaRow[] {
  return rows.filter(
    (r) => r.mezzo_id === mezzoId && normMatricola(r.matricola) === matricolaNorm,
  );
}
