import type { ImportDuplicateAction, ImportPreviewRowBase, ImportRowIssue } from "@/lib/data-import/core/types";
import type { ClientiImportRow } from "@/lib/data-import/entities/clienti/clienti-import-schema";
import {
  validateCodiceDestinatario,
  validatePartitaIva,
  validateSedeFields,
  validateContattoValore,
} from "@/lib/clienti/clienti-anagrafica-validation";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";

export function validateClientiImportRow(row: ClientiImportRow): ImportRowIssue[] {
  const issues: ImportRowIssue[] = [];
  if (!row.nomeDisplay.trim()) {
    issues.push({ field: "nome_display", message: "Nome cliente mancante.", severity: "error" });
  }
  const pivaErr = validatePartitaIva(row.partitaIva ?? "");
  if (pivaErr) issues.push({ field: "partita_iva", message: pivaErr, severity: "warning" });
  const sdiErr = validateCodiceDestinatario(row.codiceDestinatario ?? "");
  if (sdiErr) issues.push({ field: "codice_destinatario", message: sdiErr, severity: "warning" });
  if (row.sedeLegale?.cap || row.sedeLegale?.provincia) {
    for (const i of validateSedeFields(
      {
        via: row.sedeLegale.via ?? "",
        numeroCivico: row.sedeLegale.civico ?? "",
        cap: row.sedeLegale.cap ?? "",
        citta: row.sedeLegale.citta ?? "",
        provincia: row.sedeLegale.provincia ?? "",
        stato: "IT",
      },
      "sede_legale",
    )) {
      issues.push({ field: i.field, message: i.message, severity: "warning" });
    }
  }
  if (row.email) {
    const e = validateContattoValore("email", row.email);
    if (e) issues.push({ field: "email", message: e, severity: "warning" });
  }
  if (row.pec) {
    const e = validateContattoValore("pec", row.pec);
    if (e) issues.push({ field: "pec", message: e, severity: "warning" });
  }
  return issues;
}

export type ClienteDuplicateIndex = {
  byEntityKey: Map<string, { id: string; nomeDisplay: string }>;
  byPiva: Map<string, { id: string; nomeDisplay: string }>;
};

export function findClienteDuplicate(
  row: ClientiImportRow,
  index: ClienteDuplicateIndex,
): { id: string; matchKey: string } | null {
  if (row.partitaIva && index.byPiva.has(row.partitaIva)) {
    const hit = index.byPiva.get(row.partitaIva)!;
    return { id: hit.id, matchKey: `piva:${row.partitaIva}` };
  }
  const ek = buildClienteEntityKey(row.nomeDisplay);
  if (ek && index.byEntityKey.has(ek)) {
    const hit = index.byEntityKey.get(ek)!;
    return { id: hit.id, matchKey: `entity_key:${ek}` };
  }
  return null;
}

export function buildClientiPreviewRow(
  row: ClientiImportRow,
  index: ClienteDuplicateIndex,
  defaultAction: ImportDuplicateAction = "skip",
): ImportPreviewRowBase & ClientiImportRow {
  const issues = validateClientiImportRow(row);
  const dup = findClienteDuplicate(row, index);
  const hasError = issues.some((i) => i.severity === "error");
  const hasWarning = issues.some((i) => i.severity === "warning") || Boolean(dup);
  let severity: ImportPreviewRowBase["severity"] = "valid";
  if (hasError) severity = "error";
  else if (hasWarning) severity = "warning";

  let suggestedAction: ImportDuplicateAction = "create_new";
  if (dup) {
    suggestedAction = row.partitaIva ? "skip" : defaultAction;
  }

  return {
    ...row,
    issues,
    severity,
    suggestedAction,
    duplicateId: dup?.id,
    duplicateLabel: dup?.matchKey,
  };
}

export function buildClientiDuplicateIndex(
  rows: Array<{ id: string; nome_display: string; entity_key: string; partita_iva: string | null }>,
): ClienteDuplicateIndex {
  const byEntityKey = new Map<string, { id: string; nomeDisplay: string }>();
  const byPiva = new Map<string, { id: string; nomeDisplay: string }>();
  for (const r of rows) {
    if (r.entity_key) byEntityKey.set(r.entity_key, { id: r.id, nomeDisplay: r.nome_display });
    const piva = r.partita_iva?.replace(/\D/g, "");
    if (piva && piva.length === 11) byPiva.set(piva, { id: r.id, nomeDisplay: r.nome_display });
  }
  return { byEntityKey, byPiva };
}
