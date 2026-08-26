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
  const now = new Date().toISOString();
  const { data: pending } = await sb
    .from("ai_part_searches")
    .select("id, created_by, status, input_json, attempt_count")
    .eq("status", "pending")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(limit * 3);

  const claimed: PartSearchRow[] = [];
  for (const row of pending ?? []) {
    if (claimed.length >= limit) break;
    const { data: updated, error } = await sb
      .from("ai_part_searches")
      .update({
        status: "processing",
        attempt_count: (row.attempt_count as number) + 1,
        updated_at: now,
      })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id, created_by, status, input_json, attempt_count")
      .maybeSingle();
    if (!error && updated) claimed.push(updated as PartSearchRow);
  }
  return claimed;
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
