import { z } from "zod";
import { MEZZO_LABEL_FORMATS } from "@/lib/mezzo-labels/domain/types";
import { MEZZO_BULK_ABSOLUTE_MAX } from "@/lib/mezzo-labels/validation";

export const lavorazioniMezzoLabelBulkRequestSchema = z.object({
  workOrderIds: z.array(z.string().uuid()).min(1).max(MEZZO_BULK_ABSOLUTE_MAX),
  format: z.enum(MEZZO_LABEL_FORMATS).default("pdf"),
});

export function normalizeWorkOrderBulkIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids.map((s) => s.trim()).filter(Boolean)) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function workOrderBulkIdsFromSearchParams(params: URLSearchParams): string[] {
  const fromRepeated = normalizeWorkOrderBulkIds(params.getAll("id"));
  if (fromRepeated.length > 0) return fromRepeated;
  const csv = params.get("ids");
  if (!csv) return [];
  return normalizeWorkOrderBulkIds(csv.split(","));
}
