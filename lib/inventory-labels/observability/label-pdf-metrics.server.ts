import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LabelEventType } from "@/lib/inventory-labels/domain/types";
import { writeInventoryLabelEvent } from "@/lib/inventory-labels/audit/events.server";
import {
  buildLabelPdfMetricsPayload,
  type LabelPdfMetricsPayload,
} from "@/lib/inventory-labels/observability/label-pdf-metrics";

export { buildLabelPdfMetricsPayload, type LabelPdfMetricsPayload } from "@/lib/inventory-labels/observability/label-pdf-metrics";

export async function recordLabelPdfMetrics(
  sb: SupabaseClient,
  input: {
    eventType: LabelEventType;
    entityType: string;
    entityId: string;
    userId?: string | null;
    metrics: LabelPdfMetricsPayload;
  },
): Promise<void> {
  await writeInventoryLabelEvent(sb, {
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    userId: input.userId,
    payload: buildLabelPdfMetricsPayload(input.metrics),
  });
}
