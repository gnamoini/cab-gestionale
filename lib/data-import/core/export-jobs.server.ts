import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { ImportEntity } from "@/lib/data-import/core/types";
import { runExport } from "@/lib/data-import/core/export-orchestrator.server";
import type { ExportMode } from "@/lib/data-import/core/field-schema";

export async function createExportJob(input: {
  entity: ImportEntity;
  userId: string;
  mode: ExportMode;
  format: "xlsx" | "csv" | "zip";
  scope?: Record<string, unknown>;
}): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("export_jobs")
    .insert({
      entity: input.entity,
      user_id: input.userId,
      export_mode: input.mode,
      format: input.format,
      scope: input.scope ?? {},
      status: "queued",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const jobId = String(data.id);
  void processExportJob(jobId, input);
  return jobId;
}

async function processExportJob(
  jobId: string,
  input: {
    entity: ImportEntity;
    userId: string;
    mode: ExportMode;
    format: "xlsx" | "csv" | "zip";
    scope?: Record<string, unknown>;
  },
): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  try {
    await sb.from("export_jobs").update({ status: "running", progress: 10 }).eq("id", jobId);
    const { buffer, filename } = await runExport({
      entity: input.entity,
      userId: input.userId,
      mode: input.mode,
      format: input.format,
      scope: input.scope,
    });
    const path = `export-jobs/${jobId}/${filename}`;
    await sb.storage.from("import-files").upload(path, buffer, { upsert: true });
    await sb
      .from("export_jobs")
      .update({ status: "success", progress: 100, result_path: path, finished_at: new Date().toISOString() })
      .eq("id", jobId);
  } catch (e) {
    await sb
      .from("export_jobs")
      .update({
        status: "failed",
        error_message: e instanceof Error ? e.message : "Export failed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

export async function getExportJob(jobId: string) {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("export_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
