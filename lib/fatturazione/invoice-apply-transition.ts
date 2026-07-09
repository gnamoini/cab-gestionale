import type { InvoiceTransition } from "@/src/types/supabase-tables";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

export async function invoiceApplyTransition(
  invoiceId: string,
  transition: InvoiceTransition,
  payload?: Record<string, unknown>,
  expectedVersion?: number,
): Promise<{ ok: true } | { ok: false; error: string; conflict?: boolean }> {
  const c = getBrowserSupabase();
  const { error } = await c.rpc("invoice_apply_transition", {
    p_invoice_id: invoiceId,
    p_transition: transition,
    p_payload: payload ?? {},
    p_expected_version: expectedVersion ?? null,
  });
  if (error) {
    const conflict = error.message.includes("invoice_version_conflict");
    return { ok: false, error: conflict ? "Fattura modificata da un altro utente. Ricarica e riprova." : error.message, conflict };
  }
  return { ok: true };
}
