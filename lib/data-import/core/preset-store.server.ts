import "server-only";

import type { ImportEntity, ImportMappingConfig } from "@/lib/data-import/core/types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function listImportMappingPresets(userId: string, entity?: ImportEntity) {
  const sb = await createSupabaseServerUserClient();
  let q = sb.from("import_mapping_presets").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (entity) q = q.eq("entity", entity);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveImportMappingPreset(input: {
  userId: string;
  entity: ImportEntity;
  name: string;
  mapping: ImportMappingConfig;
}) {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("import_mapping_presets")
    .upsert(
      {
        user_id: input.userId,
        entity: input.entity,
        name: input.name.trim(),
        mapping: input.mapping as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,entity,name" },
    )
    .select("id, name, entity, mapping, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteImportMappingPreset(userId: string, presetId: string) {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.from("import_mapping_presets").delete().eq("id", presetId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
