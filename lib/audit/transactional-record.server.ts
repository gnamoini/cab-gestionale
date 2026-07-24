import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAuditEvent } from "@/lib/audit/record";
import type { AuditEventInput } from "@/lib/audit/types";
import { recordAuditCoverageGap } from "@/lib/audit/coverage-runtime.server";

export type AuditTransactionContext = {
  recordAudit: (input: AuditEventInput) => Promise<void>;
  mutationKey: string;
};

/**
 * Esegue mutation + audit in sequenza; se audit fallisce propaga errore.
 * Atomicità DB completa richiede RPC tipizzate (es. rpc_adjust_stock_with_audit).
 */
export async function withAuditTransaction<T>(
  client: SupabaseClient,
  mutationKey: string,
  mutationFn: (ctx: AuditTransactionContext) => Promise<T>,
): Promise<T> {
  let auditRecorded = false;

  const ctx: AuditTransactionContext = {
    mutationKey,
    recordAudit: async (input) => {
      await recordAuditEvent(client, input);
      auditRecorded = true;
    },
  };

  try {
    const result = await mutationFn(ctx);
    if (!auditRecorded) {
      await recordAuditCoverageGap(client, {
        mutationKey,
        expectedAudit: true,
        actualAudit: false,
      });
    }
    return result;
  } catch (error) {
    if (!auditRecorded) {
      await recordAuditCoverageGap(client, {
        mutationKey,
        expectedAudit: true,
        actualAudit: false,
      }).catch(() => undefined);
    }
    throw error;
  }
}
