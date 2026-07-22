import { z } from "zod";
import { DEFAULT_LABEL_PRESET, LABEL_PRESET_IDS } from "@/lib/inventory-labels/domain/templates";
import { DEFAULT_INCLUDE_BARCODE, LABEL_FORMATS } from "@/lib/inventory-labels/domain/types";
import {
  BULK_QUANTITY_MAX,
  BULK_QUANTITY_MIN,
  BULK_UNIQUE_MAX,
  totalBulkLabelCount,
  type BulkLabelCompactItem,
} from "@/lib/inventory-labels/domain/bulk-items";

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

const LABEL_JOB_NO_BARCODE_SUFFIX = "::no-barcode";

export const bulkLabelItemSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().int().min(BULK_QUANTITY_MIN).max(BULK_QUANTITY_MAX),
  preset: labelPresetSchema.optional(),
});

export type BulkLabelRequestItem = z.infer<typeof bulkLabelItemSchema>;

export type NormalizedBulkLabelRequest = {
  items: BulkLabelCompactItem[];
  preset: string;
  format: z.infer<typeof labelFormatSchema>;
  includeBarcode: boolean;
  labelOptions?: Record<string, unknown>;
  totalLabels: number;
};

/** ponytail: persistenza includeBarcode su job async senza migration — upgrade path: colonna dedicata. */
export function formatLabelJobPreset(preset: string, includeBarcode: boolean): string {
  return includeBarcode ? preset : `${preset}${LABEL_JOB_NO_BARCODE_SUFFIX}`;
}

export function parseLabelJobPreset(stored: string): { preset: string; includeBarcode: boolean } {
  if (stored.endsWith(LABEL_JOB_NO_BARCODE_SUFFIX)) {
    return {
      preset: stored.slice(0, -LABEL_JOB_NO_BARCODE_SUFFIX.length),
      includeBarcode: false,
    };
  }
  return { preset: stored, includeBarcode: true };
}

const bulkLabelRequestBaseSchema = z.object({
  preset: labelPresetSchema,
  format: labelFormatSchema.default("pdf"),
  includeBarcode: z.boolean().default(DEFAULT_INCLUDE_BARCODE),
  labelOptions: z.record(z.string(), z.unknown()).optional(),
});

export const bulkLabelRequestSchema = bulkLabelRequestBaseSchema
  .extend({
    items: z.array(bulkLabelItemSchema).min(1).max(BULK_UNIQUE_MAX).optional(),
    ids: z.array(z.string().uuid()).min(1).max(BULK_UNIQUE_MAX).optional(),
  })
  .superRefine((data, ctx) => {
    const hasItems = Array.isArray(data.items) && data.items.length > 0;
    const hasIds = Array.isArray(data.ids) && data.ids.length > 0;
    if (!hasItems && !hasIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Specificare items o ids",
        path: ["items"],
      });
      return;
    }
    if (hasItems && hasIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Non usare items e ids insieme",
        path: ["ids"],
      });
      return;
    }
    const items: BulkLabelCompactItem[] = hasItems
      ? data.items!
      : data.ids!.map((id) => ({ id, quantity: 1 }));
    const total = totalBulkLabelCount(items);
    if (total > BULK_ABSOLUTE_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Massimo ${BULK_ABSOLUTE_MAX} etichette totali`,
        path: ["items"],
      });
    }
  });

export function normalizeBulkLabelRequest(
  parsed: z.infer<typeof bulkLabelRequestSchema>,
): NormalizedBulkLabelRequest {
  const items: BulkLabelCompactItem[] =
    parsed.items && parsed.items.length > 0
      ? parsed.items
      : (parsed.ids ?? []).map((id) => ({ id, quantity: 1 }));
  return {
    items,
    preset: parsed.preset,
    format: parsed.format,
    includeBarcode: parsed.includeBarcode,
    labelOptions: parsed.labelOptions,
    totalLabels: totalBulkLabelCount(items),
  };
}

/** @deprecated Usare bulkLabelRequestSchema — mantenuto per test legacy. */
export const legacyBulkLabelIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(BULK_ABSOLUTE_MAX),
  preset: labelPresetSchema,
  format: labelFormatSchema.default("pdf"),
  includeBarcode: z.boolean().default(DEFAULT_INCLUDE_BARCODE),
});

export const renderLabelQuerySchema = z.object({
  format: labelFormatSchema.default("png"),
  preset: labelPresetSchema.default(DEFAULT_LABEL_PRESET),
  includeBarcode: z
    .enum(["true", "false"])
    .optional()
    .default(DEFAULT_INCLUDE_BARCODE ? "true" : "false")
    .transform((v) => v === "true"),
  quantity: z.coerce.number().int().min(BULK_QUANTITY_MIN).max(BULK_QUANTITY_MAX).default(1),
});

export function isBulkSyncCount(totalLabelCount: number): boolean {
  return totalLabelCount <= BULK_SYNC_MAX;
}
