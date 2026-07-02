import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type DocumentCaptureEventRow = {
  id: string;
  event_type: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
  created_at: string;
  actor_id: string | null;
};

export async function fetchDocumentCaptureEvents(captureId: string): Promise<DocumentCaptureEventRow[]> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("document_capture_events")
    .select("id, event_type, idempotency_key, payload, created_at, actor_id")
    .eq("document_capture_id", captureId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DocumentCaptureEventRow[];
}
