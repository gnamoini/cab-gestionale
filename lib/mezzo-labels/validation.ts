import { z } from "zod";
import { MEZZO_LABEL_FORMATS } from "@/lib/mezzo-labels/domain/types";

export const MEZZO_BULK_ABSOLUTE_MAX = 500;

export const renderMezzoLabelQuerySchema = z.object({
  format: z.enum(MEZZO_LABEL_FORMATS).default("pdf"),
});

export const mezzoLabelBulkRequestSchema = z
  .object({
    mezzoIds: z.array(z.string().uuid()).optional(),
    selectAllMatching: z.boolean().optional(),
    filter: z.record(z.string(), z.unknown()).optional(),
    format: z.enum(MEZZO_LABEL_FORMATS).default("pdf"),
  })
  .refine(
    (v) =>
      (Array.isArray(v.mezzoIds) && v.mezzoIds.length > 0) ||
      v.selectAllMatching === true,
    { message: "Specificare mezzoIds o selectAllMatching" },
  );

export type MezzoLabelBulkRequest = z.infer<typeof mezzoLabelBulkRequestSchema>;

export const mezzoLabelBulkQuerySchema = z.object({
  format: z.enum(MEZZO_LABEL_FORMATS).default("pdf"),
  id: z.array(z.string().uuid()).optional(),
});

export function mezzoBulkIdsFromSearchParams(params: URLSearchParams): string[] {
  const fromRepeated = normalizeMezzoBulkIds(params.getAll("id"));
  if (fromRepeated.length > 0) return fromRepeated;
  const csv = params.get("ids");
  if (!csv) return [];
  return normalizeMezzoBulkIds(csv.split(","));
}

export function normalizeMezzoBulkIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}
