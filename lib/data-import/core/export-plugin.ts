import "server-only";

import type { ImportEntityPlugin } from "@/lib/data-import/core/import-plugin";

export type ExportFormat = "xlsx" | "csv" | "json" | "xml";

export interface ExportEntityPlugin {
  entityId: ImportEntityPlugin["id"];
  supportedFormats: ExportFormat[];
  fetchExportRows(filters?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  generateExport(format: ExportFormat, filters?: Record<string, unknown>): Promise<Buffer>;
}

export class ExportNotEnabledError extends Error {
  constructor(entityId: string) {
    super(`Export non abilitato per entità ${entityId}.`);
    this.name = "ExportNotEnabledError";
  }
}

export async function generateStubCsvExport(
  fields: ImportEntityPlugin["fields"],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const headers = fields.map((f) => f.key);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))];
  return Buffer.from(lines.join("\n"), "utf-8");
}
