"use client";

import { useCallback, useState } from "react";
import { useImportFileUpload } from "@/lib/import-files/use-import-file-upload";
import {
  analyzeInventoryReceivingImport,
  fetchInventoryReceivingDocument,
  fetchInventoryReceivingPending,
  InventoryReceivingAnalyzeClientError,
  type InventoryLineDecision,
} from "@/lib/inventory-receiving/inventory-receiving-import-client";
import type { InventoryReceivingPendingItem } from "@/lib/inventory-receiving/documents/inventory-receiving-pending-types";
import type { InventoryReceivingFlowStep } from "@/components/gestionale/magazzino/carichi/inventory-receiving-step-indicator";
import {
  defaultLineActionWithGate,
  inferMatchMethod,
} from "@/lib/inventory-receiving/matching/confidence-gate";
import type { MatchCandidate } from "@/lib/inventory-receiving/documents/inventory-receiving-types";
import type { InventoryDocumentLineRow, InventoryDocumentRow } from "@/src/types/supabase-tables";
import { inventoryReceivingFlowStepFromDocument } from "@/lib/inventory-receiving/documents/inventory-receiving-ui-status";

function buildDecisionsFromLines(
  lines: InventoryDocumentLineRow[],
  candidatesByLineId: Record<string, MatchCandidate[]>,
): Record<string, InventoryLineDecision> {
  const out: Record<string, InventoryLineDecision> = {};
  for (const line of lines) {
    const method =
      candidatesByLineId[line.id]?.[0]?.method ??
      inferMatchMethod({ matchStatus: line.match_status, matchConfidence: line.match_confidence });
    const action = line.user_action ?? defaultLineActionWithGate(line.match_status, line.match_confidence, method);
    out[line.id] = {
      action: action as InventoryLineDecision["action"],
      manualMatchItemId: line.matched_item_id ?? undefined,
      newItemCodice: line.raw_code?.trim() || undefined,
      newItemNome: line.extracted_description,
    };
  }
  return out;
}

function candidatesFromMatches(
  lines: InventoryDocumentLineRow[],
  matches?: MatchCandidate[][],
): Record<string, MatchCandidate[]> {
  if (!matches?.length) return {};
  const out: Record<string, MatchCandidate[]> = {};
  lines.forEach((line, index) => {
    out[line.id] = matches[index] ?? [];
  });
  return out;
}

export function useInventoryReceivingFlow() {
  const upload = useImportFileUpload();
  const [step, setStep] = useState<InventoryReceivingFlowStep>("hub");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [document, setDocument] = useState<InventoryDocumentRow | null>(null);
  const [lines, setLines] = useState<InventoryDocumentLineRow[]>([]);
  const [lineDecisions, setLineDecisions] = useState<Record<string, InventoryLineDecision>>({});
  const [candidatesByLineId, setCandidatesByLineId] = useState<Record<string, MatchCandidate[]>>({});
  const [pendingImportFileId, setPendingImportFileId] = useState<string | null>(null);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const [duplicateDocumentId, setDuplicateDocumentId] = useState<string | null>(null);
  const [pendingItems, setPendingItems] = useState<InventoryReceivingPendingItem[]>([]);

  const reset = useCallback(() => {
    setStep("hub");
    setAnalyzing(false);
    setError(null);
    setWarnings([]);
    setDocument(null);
    setLines([]);
    setLineDecisions({});
    setCandidatesByLineId({});
    setPendingImportFileId(null);
    setDuplicateMessage(null);
    setDuplicateDocumentId(null);
    upload.reset();
  }, [upload]);

  const refreshPending = useCallback(async () => {
    const items = await fetchInventoryReceivingPending();
    setPendingItems(items);
    return items;
  }, []);

  const applyDocumentPayload = useCallback(
    (
      doc: InventoryDocumentRow,
      lineRows: InventoryDocumentLineRow[],
      candidates?: Record<string, MatchCandidate[]>,
      matchMatrix?: MatchCandidate[][],
    ) => {
      const candidateMap = candidates ?? candidatesFromMatches(lineRows, matchMatrix);
      setDocument(doc);
      setLines(lineRows);
      setCandidatesByLineId(candidateMap);
      setLineDecisions(buildDecisionsFromLines(lineRows, candidateMap));
      setStep(inventoryReceivingFlowStepFromDocument(doc.status));
      setError(null);
    },
    [],
  );

  const loadDocument = useCallback(
    async (id: string) => {
      const body = await fetchInventoryReceivingDocument(id);
      applyDocumentPayload(body.document, body.lines, body.candidatesByLineId);
    },
    [applyDocumentPayload],
  );

  const runAnalyze = useCallback(
    async (importFileId: string, opts?: { skipHashDuplicate?: boolean }) => {
      setAnalyzing(true);
      setError(null);
      setStep("analyze");
      try {
        const result = await analyzeInventoryReceivingImport({
          importFileId,
          skipHashDuplicate: opts?.skipHashDuplicate,
        });
        applyDocumentPayload(result.document, result.lines, undefined, result.matches);
        setWarnings(result.warnings ?? []);
        setPendingImportFileId(null);
        setDuplicateMessage(null);
        setDuplicateDocumentId(null);
        void refreshPending();
        return true;
      } catch (e) {
        if (e instanceof InventoryReceivingAnalyzeClientError && (e.code === "DUPLICATE_HASH" || e.code === "DUPLICATE_SEMANTIC")) {
          setPendingImportFileId(importFileId);
          setDuplicateMessage(e.message);
          setDuplicateDocumentId(e.duplicateDocumentId ?? null);
          setStep("hub");
          return false;
        }
        setError(e instanceof Error ? e.message : "Analisi non riuscita.");
        setStep("hub");
        return false;
      } finally {
        setAnalyzing(false);
      }
    },
    [applyDocumentPayload, refreshPending],
  );

  const retryAnalyze = useCallback(async () => {
    if (!pendingImportFileId) return false;
    return runAnalyze(pendingImportFileId);
  }, [pendingImportFileId, runAnalyze]);

  const onFileSelected = useCallback(
    async (file: File) => {
      setError(null);
      setDuplicateMessage(null);
      setDuplicateDocumentId(null);
      const uploaded = await upload.upload({ file, kind: "ddt_receiving" });
      if (!uploaded?.fileId) {
        setError(upload.error ?? "Upload non riuscito.");
        setStep("hub");
        return;
      }
      setPendingImportFileId(uploaded.fileId);
      await runAnalyze(uploaded.fileId);
    },
    [runAnalyze, upload],
  );

  const confirmDuplicate = useCallback(async () => {
    if (!pendingImportFileId) return;
    await runAnalyze(pendingImportFileId, { skipHashDuplicate: true });
  }, [pendingImportFileId, runAnalyze]);

  const resumePendingImport = useCallback(
    async (importFileId: string) => {
      setPendingImportFileId(importFileId);
      await runAnalyze(importFileId);
    },
    [runAnalyze],
  );

  const updateLineQty = useCallback((lineId: string, receivedQuantity: number) => {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, received_quantity: receivedQuantity } : l)));
  }, []);

  const updateLineDecision = useCallback((lineId: string, patch: Partial<InventoryLineDecision>) => {
    setLineDecisions((prev) => ({
      ...prev,
      [lineId]: { ...prev[lineId], ...patch } as InventoryLineDecision,
    }));
  }, []);

  return {
    upload,
    step,
    setStep,
    analyzing,
    error,
    setError,
    warnings,
    document,
    lines,
    lineDecisions,
    candidatesByLineId,
    pendingImportFileId,
    duplicateMessage,
    duplicateDocumentId,
    pendingItems,
    reset,
    refreshPending,
    loadDocument,
    onFileSelected,
    confirmDuplicate,
    retryAnalyze,
    resumePendingImport,
    updateLineQty,
    updateLineDecision,
  };
}
