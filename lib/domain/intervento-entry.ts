"use client";

import { ensurePageWrite } from "@/src/lib/auth/permission-guards";
import { createWriteExecutionTrace, finalizeTrace } from "@/lib/domain/intervento-context/write-execution-trace";
import {
  executeInterventoWrite,
} from "@/lib/domain/intervento-context/write-contract";
import type {
  InterventoWriteDeps,
  InterventoWritePlan,
} from "@/lib/domain/intervento-context/intervento-write-types";
import type { InterventoWriteExecutionOutcome } from "@/lib/domain/intervento-context/write-contract";

/**
 * Entrypoint auth boundary for intervento write orchestration.
 * Single ensurePageWrite per request graph — write-contract stays authorization-free.
 */
export async function executeInterventoWriteEntry(
  plan: InterventoWritePlan,
  deps: InterventoWriteDeps,
): Promise<InterventoWriteExecutionOutcome> {
  const allowed = await ensurePageWrite("lavorazioni");
  if (!allowed.success) {
    const trace = createWriteExecutionTrace("v1");
    const result = {
      ok: false as const,
      stage: "prepare-lavorazione" as const,
      error: allowed.error ?? "Permesso richiesto.",
    };
    finalizeTrace(trace, result);
    return { result, trace };
  }
  return executeInterventoWrite(plan, deps);
}
