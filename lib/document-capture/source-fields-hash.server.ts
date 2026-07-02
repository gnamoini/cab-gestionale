import "server-only";

import {
  CapturePlanStaleError,
  hashConfirmedCaptureFields,
} from "@/lib/document-capture/capture-plan-staleness";
import { resolveFieldsForHash } from "@/lib/document-capture/resolve-fields-for-hash";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export { CapturePlanStaleError, hashConfirmedCaptureFields };

export async function loadConfirmedFieldsHash(captureId: string): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb
    .from("document_capture_fields")
    .select("field_key, confirmed_value, normalized_value")
    .eq("document_capture_id", captureId);

  return hashConfirmedCaptureFields(resolveFieldsForHash((data ?? []) as Array<{
    field_key: string;
    confirmed_value: string | null;
    normalized_value: string | null;
  }>));
}
