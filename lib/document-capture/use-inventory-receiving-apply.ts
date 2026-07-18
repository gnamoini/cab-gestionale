"use client";

import { useCallback, useMemo, useState } from "react";
import {
  inventoryReceivingApplyAdapter,
  runCaptureApplyPipeline,
} from "@/lib/document-capture/apply/capture-apply-engine";
import type { InventoryReceivingApplyInput } from "@/lib/document-capture/apply/adapters/inventory-receiving-apply-adapter";
import type { CaptureReviewStateSummary } from "@/lib/document-capture/capture-review-state";

export function useInventoryReceivingApply(input: InventoryReceivingApplyInput | null) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<CaptureReviewStateSummary | null>(null);

  const dryRun = useCallback(() => {
    if (!input?.documentId) return null;
    const result = inventoryReceivingApplyAdapter.dryRun(input);
    setValidation(result.validation);
    return result;
  }, [input]);

  const movementCount = useMemo(() => {
    if (!input?.documentId) return 0;
    return inventoryReceivingApplyAdapter.dryRun(input).movementCount ?? 0;
  }, [input]);

  const confirmAndApply = useCallback(async () => {
    if (!input?.documentId) return false;
    setBusy(true);
    setError(null);
    try {
      await runCaptureApplyPipeline(inventoryReceivingApplyAdapter, input);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Importazione fallita.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input]);

  return { busy, error, validation, movementCount, dryRun, confirmAndApply, setError };
}
