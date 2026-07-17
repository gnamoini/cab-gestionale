import { z } from "zod";
import { LABEL_PRESET_IDS } from "@/lib/inventory-labels/domain/templates";
import { LABEL_FORMATS } from "@/lib/inventory-labels/domain/types";

const BULK_SYNC_MAX_DEFAULT = 10;

function readBulkSyncMax(): number {
  const raw = Number(process.env.LABEL_BULK_SYNC_MAX);
  if (Number.isFinite(raw) && raw > 0) return Math.min(100, Math.max(1, raw));
  return BULK_SYNC_MAX_DEFAULT;
}

/** Max etichette in risposta sync HTTP — oltre soglia → job DB async. */
export const BULK_SYNC_MAX = readBulkSyncMax();
export const BULK_ABSOLUTE_MAX = 500;

export const labelPresetSchema = z.enum(LABEL_PRESET_IDS as [string, ...string[]]);

export const labelFormatSchema = z.enum(LABEL_FORMATS);

export const bulkLabelRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(BULK_ABSOLUTE_MAX),
  preset: labelPresetSchema,
  format: labelFormatSchema.default("pdf"),
});

export const renderLabelQuerySchema = z.object({
  format: labelFormatSchema.default("png"),
  preset: labelPresetSchema.default("60x40-default"),
});

export function isBulkSyncCount(count: number): boolean {
  return count <= BULK_SYNC_MAX;
}
