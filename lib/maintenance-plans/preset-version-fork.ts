import type { SupabaseClient } from "@supabase/supabase-js";
import { MAINTENANCE_PRESET_VERSIONS_COLUMNS } from "@/lib/db/table-select-columns";

export async function countPresetExecutions(client: SupabaseClient, presetId: string): Promise<number> {
  const { count, error } = await client
    .from("vehicle_maintenance_services")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", presetId);
  if (error) return 0;
  return count ?? 0;
}

/** ponytail: fork version when preset has executions — full UI in P2 */
export async function forkPresetVersionIfUsed(
  client: SupabaseClient,
  presetId: string,
  snapshot: Record<string, unknown>,
  changeNote: string,
  userId: string | null,
): Promise<string | null> {
  const execCount = await countPresetExecutions(client, presetId);
  if (execCount === 0) return null;

  const { data: last } = await client
    .from("maintenance_preset_versions")
    .select("version_number")
    .eq("preset_id", presetId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = ((last?.version_number as number) ?? 0) + 1;

  const { data: row, error } = await client
    .from("maintenance_preset_versions")
    .insert({
      preset_id: presetId,
      version_number: nextVersion,
      snapshot_json: snapshot,
      change_note: changeNote,
      created_by: userId,
    })
    .select(MAINTENANCE_PRESET_VERSIONS_COLUMNS)
    .single();

  if (error || !row) return null;

  await client
    .from("maintenance_plans")
    .update({ current_version_id: row.id })
    .eq("id", presetId);

  return row.id as string;
}
