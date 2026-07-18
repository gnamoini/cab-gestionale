import type { CaptureReviewStateSummary } from "@/lib/document-capture/capture-review-state";
import {
  buildInventoryReceivingDecisions,
  dryRunInventoryReceivingApply,
  type InventoryReceivingApplyDecision,
  type InventoryReceivingApplyInput,
  type InventoryReceivingDryRunResult,
} from "@/lib/document-capture/apply/adapters/inventory-receiving-apply-adapter";

export type CaptureApplyValidation = CaptureReviewStateSummary & {
  blocked?: boolean;
};

export type CaptureApplyDryRunResult<TDecision> = {
  validation: CaptureApplyValidation;
  decisions: TDecision[];
  movementCount?: number;
};

export type CaptureApplyAdapter<TInput, TDecision, TResult> = {
  domain: string;
  dryRun: (input: TInput) => CaptureApplyDryRunResult<TDecision>;
  apply: (input: TInput, decisions: TDecision[]) => Promise<TResult>;
};

export async function runCaptureApplyPipeline<TInput, TDecision, TResult>(
  adapter: CaptureApplyAdapter<TInput, TDecision, TResult>,
  input: TInput,
): Promise<TResult> {
  const dry = adapter.dryRun(input);
  if (dry.validation.state === "blocked") {
    throw new Error(dry.validation.message ?? "Importazione bloccata.");
  }
  return adapter.apply(input, dry.decisions);
}

export const inventoryReceivingApplyAdapter: CaptureApplyAdapter<
  InventoryReceivingApplyInput,
  InventoryReceivingApplyDecision,
  { ok: true }
> = {
  domain: "ddt",
  dryRun: (input) => {
    const result: InventoryReceivingDryRunResult = dryRunInventoryReceivingApply(input);
    return {
      validation: { ...result.validation, blocked: result.validation.state === "blocked" },
      decisions: result.decisions,
      movementCount: result.movementCount,
    };
  },
  apply: async (input, decisions) => {
    const confirmRes = await fetch(`/api/magazzino/receiving/${input.documentId}/confirm-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions }),
    });
    if (!confirmRes.ok) {
      const body = (await confirmRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Conferma revisione non riuscita.");
    }

    const applyRes = await fetch(`/api/magazzino/receiving/${input.documentId}/apply`, { method: "POST" });
    const body = (await applyRes.json().catch(() => ({}))) as { error?: string };
    if (!applyRes.ok) throw new Error(body.error ?? "Importazione non applicata.");
    return { ok: true };
  },
};

export { buildInventoryReceivingDecisions };
