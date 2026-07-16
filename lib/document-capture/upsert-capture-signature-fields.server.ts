import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  shouldExtractCaptureSignatures,
} from "@/lib/document-capture/capture-signature-crop";
import { extractCaptureSignatureFields } from "@/lib/document-capture/capture-signature-crop.server";

type FieldRow = {
  company_id: string;
  document_capture_id: string;
  attempt_id: string;
  field_key: string;
  raw_value: string;
  normalized_value: string;
  confidence: number;
  value_source: "ai";
};

export async function upsertCaptureSignatureFields(
  sb: SupabaseClient,
  input: {
    companyId: string;
    captureId: string;
    attemptId: string;
    bytes: Uint8Array;
    mime: string;
    schedaTipo?: string | null;
    existingFieldKeys: readonly string[];
  },
): Promise<FieldRow[]> {
  if (!shouldExtractCaptureSignatures(input.schedaTipo, input.existingFieldKeys)) {
    return [];
  }

  const signatures = await extractCaptureSignatureFields({
    bytes: input.bytes,
    mime: input.mime,
  });
  if (signatures.length === 0) return [];

  const rows: FieldRow[] = signatures.map((sig) => ({
    company_id: input.companyId,
    document_capture_id: input.captureId,
    attempt_id: input.attemptId,
    field_key: sig.field_key,
    raw_value: sig.raw_value,
    normalized_value: sig.normalized_value,
    confidence: sig.confidence,
    value_source: "ai" as const,
  }));

  await sb.from("document_capture_fields").upsert(rows, {
    onConflict: "document_capture_id,field_key",
  });

  return rows;
}
