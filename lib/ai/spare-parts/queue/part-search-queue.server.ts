import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PartSearchRow = {
  id: string;
  created_by: string;
  status: string;
  input_json: Record<string, unknown>;
  attempt_count: number;
};

export async function createPartSearch(
  sb: SupabaseClient,
  input: { userId: string; inputJson: Record<string, unknown> },
): Promise<string> {
  const { data, error } = await sb
    .from("ai_part_searches")
    .insert({
      created_by: input.userId,
      status: "draft",
      input_json: input.inputJson,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function claimPartSearchJobs(
  sb: SupabaseClient,
  limit: number,
): Promise<PartSearchRow[]> {
  const { data, error } = await sb.rpc("ai_part_search_claim_jobs", { p_limit: limit });
  if (error || !data) {
    return [];
  }
  return (data as PartSearchRow[]).map((row) => ({
    id: row.id,
    created_by: row.created_by,
    status: row.status,
    input_json: row.input_json as Record<string, unknown>,
    attempt_count: row.attempt_count,
  }));
}

export async function appendSearchStage(
  sb: SupabaseClient,
  searchId: string,
  stage: { key: string; label: string; status: "running" | "completed" | "skipped" | "failed" },
): Promise<void> {
  const { data } = await sb.from("ai_part_searches").select("stages").eq("id", searchId).single();
  const stages = Array.isArray(data?.stages) ? [...(data.stages as unknown[])] : [];
  const idx = stages.findIndex((s) => typeof s === "object" && s && (s as { key?: string }).key === stage.key);
  const entry = { ...stage, at: new Date().toISOString() };
  if (idx >= 0) stages[idx] = entry;
  else stages.push(entry);
  await sb.from("ai_part_searches").update({ stages, updated_at: new Date().toISOString() }).eq("id", searchId);
}
