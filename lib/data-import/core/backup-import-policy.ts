import type { ExportMode } from "@/lib/data-import/core/field-schema";
import { createHash } from "node:crypto";

export const BACKUP_NOT_IMPORTABLE = "BACKUP_NOT_IMPORTABLE";

export class ImportValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ImportValidationError";
    this.code = code;
  }
}

export type WorkbookMeta = {
  exportMode?: ExportMode;
  templateVersion?: string;
  schemaHash?: string;
  manifestHash?: string;
  entity?: string;
};

export function computeManifestHash(input: {
  sheetNames: string[];
  columnKeys: string[];
  exportMode: string;
  templateVersion: string;
}): string {
  const canonical = [
    input.sheetNames.sort().join(","),
    input.columnKeys.sort().join(","),
    input.exportMode,
    input.templateVersion,
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

export function assertBackupImportAllowed(meta: WorkbookMeta, phase: "parse" | "preview" | "execute"): void {
  if (meta.exportMode === "backup") {
    throw new ImportValidationError(
      BACKUP_NOT_IMPORTABLE,
      `File di backup non importabile (${phase}). Usare export Importable o Template.`,
    );
  }
}

export function manifestHashWarnings(
  meta: WorkbookMeta,
  expected?: { manifestHash?: string },
): string[] {
  if (!meta.manifestHash || !expected?.manifestHash) return [];
  if (meta.manifestHash !== expected.manifestHash) {
    return ["ManifestHash non corrisponde — possibile modifica manuale del file."];
  }
  return [];
}
