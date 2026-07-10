import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type TelemetryRecord = {
  kind: "import" | "export";
  entity: string;
  userId: string;
  durationMs: number;
  rowCount?: number;
  exportMode?: string;
  strategy?: string;
  batchId?: string;
  correlationId?: string;
};

/** Operational telemetry — not business audit. */
export async function recordImportExportTelemetry(record: TelemetryRecord): Promise<void> {
  try {
    const sb = await createSupabaseServerUserClient();
    await sb.from("import_export_telemetry").insert({
      kind: record.kind,
      entity: record.entity,
      user_id: record.userId,
      duration_ms: record.durationMs,
      row_count: record.rowCount ?? null,
      export_mode: record.exportMode ?? null,
      snapshot_strategy: record.strategy ?? null,
      batch_id: record.batchId ?? null,
      correlation_id: record.correlationId ?? null,
    });
  } catch {
    // ponytail: telemetry must not block import/export
  }
}
