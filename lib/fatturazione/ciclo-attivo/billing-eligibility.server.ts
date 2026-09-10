import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export { isPreventivoAccettato } from "@/lib/fatturazione/ciclo-attivo/preventivo-accettato";

export type BillingSourceType = "preventivo" | "consuntivo" | "lavorazione" | "ddt";

export type BillingEligibility = {
  eligible: boolean;
  reason: string;
  remaining: number;
  source_type: BillingSourceType;
  source_id: string;
  recommended_document_type: "TD01" | "TD24" | "TD25";
};

type RpcClient = SupabaseClient;

/** SSOT eligibility — server reconstructs remaining; client must not declare it. */
export async function billingEligibility(
  client: RpcClient,
  sourceType: BillingSourceType,
  sourceId: string,
): Promise<BillingEligibility> {
  const { data, error } = await client.rpc("billing_eligibility", {
    p_source_type: sourceType,
    p_source_id: sourceId,
  });
  if (error) {
    return {
      eligible: false,
      reason: error.message,
      remaining: 0,
      source_type: sourceType,
      source_id: sourceId,
      recommended_document_type: "TD01",
    };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  const td = row.recommended_document_type === "TD24" || row.recommended_document_type === "TD25"
    ? row.recommended_document_type
    : "TD01";
  return {
    eligible: Boolean(row.eligible),
    reason: String(row.reason ?? "UNKNOWN"),
    remaining: Number(row.remaining ?? 0),
    source_type: sourceType,
    source_id: sourceId,
    recommended_document_type: td,
  };
}
