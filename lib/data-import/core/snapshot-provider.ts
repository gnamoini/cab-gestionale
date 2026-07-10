import type {
  ExportScope,
  SnapshotProvider,
  SnapshotProviderContext,
} from "@/lib/data-import/core/plugin-definition";
import type { NormalizedDataset, NormalizedRow, NormalizedSheet } from "@/lib/data-import/core/normalized-dataset";

export function normalizeExportScope(scope?: ExportScope): ExportScope {
  if (!scope) return {};
  const out: ExportScope = {};
  for (const [k, v] of Object.entries(scope)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export function normalizeDateToIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString();
}

export function recordsToNormalizedSheet(
  name: string,
  role: NormalizedSheet["role"],
  fields: { key: string; label: string }[],
  records: Record<string, unknown>[],
  opts?: { parentSheetName?: string; fkField?: string },
): NormalizedSheet {
  const columns = fields.map((f, index) => ({ key: f.key, label: f.label, index }));
  const rows: NormalizedRow[] = records.map((rec, i) => {
    const cells: NormalizedRow["cells"] = {};
    for (const f of fields) {
      let raw = rec[f.key];
      let parsed = raw;
      if (f.key.endsWith("_at") || f.key.includes("date")) {
        parsed = normalizeDateToIso(raw);
      }
      cells[f.key] = { raw, parsed, issues: [] };
    }
    return { rowIndex: i + 2, cells };
  });
  return {
    name,
    role,
    columns,
    rows,
    parentSheetName: opts?.parentSheetName,
    fkField: opts?.fkField,
  };
}

export async function fetchViaSnapshotProvider(
  provider: SnapshotProvider,
  ctx: SnapshotProviderContext,
): Promise<NormalizedDataset> {
  return provider.fetch(ctx);
}

export type PaginationOpts = {
  limit: number;
  offset: number;
};

export function paginateRecords<T>(records: T[], opts: PaginationOpts): T[] {
  return records.slice(opts.offset, opts.offset + opts.limit);
}
