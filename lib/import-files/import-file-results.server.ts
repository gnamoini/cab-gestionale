import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function recordImportFileResult(input: {
  importFileId: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.from("import_file_results").upsert(
    {
      import_file_id: input.importFileId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      meta: input.meta ?? {},
    },
    { onConflict: "import_file_id,entity_type,entity_id" },
  );
  if (error) throw new Error(error.message);
}
