import { buildRicambioPersistEntityKey } from "@/lib/validation/entity-keys";
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";
import type {
  ListinoImportAction,
  ListinoImportPreviewRow,
  ListinoImportRawRow,
  MagazzinoDuplicateIndexEntry,
} from "@/lib/magazzino/listino-import/listino-import-types";

function entityKeyForCodice(codice: string): string | null {
  return buildRicambioPersistEntityKey({ codice: normalizeRicambioCodice(codice) });
}

export function buildMagazzinoDuplicateIndex(
  rows: MagazzinoDuplicateIndexEntry[],
): Map<string, MagazzinoDuplicateIndexEntry> {
  const map = new Map<string, MagazzinoDuplicateIndexEntry>();
  for (const row of rows) {
    const key = row.entityKey?.trim() || entityKeyForCodice(row.codice);
    if (!key) continue;
    if (!map.has(key)) map.set(key, row);
    const codiceNorm = normalizeRicambioCodice(row.codice);
    if (codiceNorm && !map.has(codiceNorm)) map.set(codiceNorm, row);
  }
  return map;
}

export function findDuplicateForListinoRow(
  row: ListinoImportRawRow,
  index: Map<string, MagazzinoDuplicateIndexEntry>,
): MagazzinoDuplicateIndexEntry | undefined {
  const codiceNorm = normalizeRicambioCodice(row.codice);
  const entityKey = entityKeyForCodice(row.codice);
  if (entityKey && index.has(entityKey)) return index.get(entityKey);
  if (codiceNorm && index.has(codiceNorm)) return index.get(codiceNorm);
  return undefined;
}

export function enrichListinoRowsWithDuplicates(
  rawRows: ListinoImportRawRow[],
  magazzinoRows: MagazzinoDuplicateIndexEntry[],
): ListinoImportPreviewRow[] {
  const index = buildMagazzinoDuplicateIndex(magazzinoRows);

  return rawRows.map((row, rowIndex) => {
    const dup = findDuplicateForListinoRow(row, index);
    const suggestedAction: ListinoImportAction = dup ? "skip" : "create";
    const preview: ListinoImportPreviewRow = {
      ...row,
      rowIndex,
      suggestedAction,
    };
    if (dup) {
      preview.duplicateRicambioId = dup.id;
      preview.duplicateCodice = dup.codice;
      preview.existingCosto = dup.costo ?? undefined;
    }
    return preview;
  });
}
