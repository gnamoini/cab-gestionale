import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTkbDraft } from "../ingestion/builder";
import { saveTkbDraftStore } from "../tkb-repository.server";

export async function rebuildTkbDraftFull(supabase: SupabaseClient) {
  await import("../ingestion/register-sources");
  const bundle = await buildTkbDraft(supabase, { mode: "full" });
  await saveTkbDraftStore(supabase, bundle, { stale: false, pendingEvents: [], buildMode: "full" });
  return bundle;
}
