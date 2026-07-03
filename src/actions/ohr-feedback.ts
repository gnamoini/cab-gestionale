"use server";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { recordOperativeHistoryFeedback } from "@/lib/preventivi/description-engine/operative-history/case-index-builder.server";

/** Feedback implicito post-revisione preventivo (non modifica TKB). */
export async function recordOhrFeedbackAction(opts: {
  preventivoId: string;
  zeroEdit: boolean;
}): Promise<{ ok: boolean }> {
  const supabase = await createSupabaseServerUserClient();
  await recordOperativeHistoryFeedback(supabase, opts);
  return { ok: true };
}
