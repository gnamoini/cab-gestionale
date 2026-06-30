import type { ImportDuplicateAction, ImportPreviewRowBase, ImportRowIssue } from "@/lib/data-import/core/types";
import type { MagazzinoImportRow } from "@/lib/data-import/entities/magazzino/magazzino-import-schema";
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";

export type MagazzinoDuplicateIndex = Map<
  string,
  { id: string; codice: string; nome: string; costo: number | null; quantita: number }
>;

export function validateMagazzinoRow(row: MagazzinoImportRow): ImportRowIssue[] {
  const issues: ImportRowIssue[] = [];
  if (!row.codice || row.codice === "—") {
    issues.push({ field: "codice", message: "Codice articolo mancante.", severity: "error" });
  }
  if (!row.descrizione.trim()) {
    issues.push({ field: "descrizione", message: "Descrizione mancante.", severity: "error" });
  }
  if (row.costo != null && row.costo < 0) {
    issues.push({ field: "costo", message: "Costo non valido.", severity: "error" });
  }
  if (row.quantita != null && row.quantita < 0) {
    issues.push({ field: "quantita", message: "Giacenza negativa.", severity: "warning" });
  }
  if (row.prezzo_vendita != null && row.costo != null && row.prezzo_vendita < row.costo) {
    issues.push({ field: "prezzo_vendita", message: "Prezzo vendita inferiore al costo.", severity: "warning" });
  }
  return issues;
}

export function buildMagazzinoPreviewRow(
  row: MagazzinoImportRow,
  index: Map<string, { id: string; codice: string; nome: string; costo: number | null; quantita: number }>,
  defaultAction: ImportDuplicateAction = "update",
): ImportPreviewRowBase & MagazzinoImportRow {
  const issues = validateMagazzinoRow(row);
  const key = normalizeRicambioCodice(row.codice);
  const dup = key ? index.get(key) : undefined;
  const hasError = issues.some((i) => i.severity === "error");
  const hasWarning = issues.some((i) => i.severity === "warning");
  let severity: ImportPreviewRowBase["severity"] = "valid";
  if (hasError) severity = "error";
  else if (hasWarning || dup) severity = "warning";

  return {
    ...row,
    issues,
    severity,
    suggestedAction: dup ? defaultAction : "create_new",
    duplicateId: dup?.id,
    duplicateLabel: dup?.codice,
  };
}

export function buildMagazzinoDuplicateIndex(
  rows: Array<{ id: string; codice: string; nome: string; costo: number | null; quantita: number }>,
): MagazzinoDuplicateIndex {
  const m = new Map<string, { id: string; codice: string; nome: string; costo: number | null; quantita: number }>();
  for (const r of rows) {
    const key = normalizeRicambioCodice(r.codice);
    if (key) m.set(key, r);
  }
  return m;
}
