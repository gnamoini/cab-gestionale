"use client";

import { useMemo } from "react";
import {
  DOCUMENT_CONFIDENCE_CAUTION_THRESHOLD,
  needsCautionReview,
} from "@/lib/inventory-receiving/extraction/compute-document-confidence";
import { inventoryDocumentStatusLabel } from "@/lib/inventory-receiving/documents/inventory-receiving-status";
import type { InventoryLineDecision } from "@/lib/inventory-receiving/inventory-receiving-import-client";
import {
  inferMatchMethod,
  lineRequiresReview,
} from "@/lib/inventory-receiving/matching/confidence-gate";
import type { MatchCandidate } from "@/lib/inventory-receiving/documents/inventory-receiving-types";
import type { InventoryDocumentLineRow, InventoryDocumentRow } from "@/src/types/supabase-tables";
import { dsBtnPrimary } from "@/lib/ui/design-system";
import {
  CaptureConfidenceBadge,
  DocumentCaptureReviewTable,
  type DocumentCaptureReviewRow,
} from "@/components/document-capture/document-capture-review-table";
import { EntityMatcher } from "@/components/document-capture/entity-matcher";
import { CaptureReviewStateBanner } from "@/components/document-capture/capture-review-warnings";
import { inventoryReceivingCaptureAdapter } from "@/lib/document-capture/inventory-receiving-capture-adapter";

function matchStatusLabel(status: string): string {
  switch (status) {
    case "FOUND":
      return "Trovato";
    case "SUGGESTED":
      return "Suggerito";
    case "NEW_ITEM":
      return "Nuovo";
    case "REJECTED":
      return "Scartato";
    default:
      return status;
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case "add":
      return "Aggiungi";
    case "create":
      return "Crea articolo";
    case "skip":
      return "Salta";
    default:
      return action;
  }
}

type Props = {
  document: InventoryDocumentRow;
  lines: InventoryDocumentLineRow[];
  lineDecisions: Record<string, InventoryLineDecision>;
  candidatesByLineId: Record<string, MatchCandidate[]>;
  canWrite: boolean;
  applying?: boolean;
  error?: string | null;
  onLineQtyChange: (lineId: string, receivedQuantity: number) => void;
  onLineDecisionChange: (lineId: string, patch: Partial<InventoryLineDecision>) => void;
  onApply: () => void;
  showApplyButton?: boolean;
};

export function ReceivingReviewPanel({
  document,
  lines,
  lineDecisions,
  candidatesByLineId,
  canWrite,
  applying = false,
  error = null,
  onLineQtyChange,
  onLineDecisionChange,
  onApply,
  showApplyButton = true,
}: Props) {
  const caution = useMemo(
    () => (document.document_ai_confidence != null ? needsCautionReview(document.document_ai_confidence) : false),
    [document.document_ai_confidence],
  );

  const reviewRequiredCount = useMemo(
    () =>
      lines.filter((line) => {
        const method =
          candidatesByLineId[line.id]?.[0]?.method ??
          inferMatchMethod({ matchStatus: line.match_status, matchConfidence: line.match_confidence });
        return lineRequiresReview({
          matchStatus: line.match_status,
          matchConfidence: line.match_confidence,
          method,
        });
      }).length,
    [candidatesByLineId, lines],
  );

  const reviewSummary = useMemo(
    () =>
      inventoryReceivingCaptureAdapter.reviewState({
        reviewRequiredCount,
        totalLines: lines.length,
        approved: document.status === "APPLIED",
      }),
    [document.status, lines.length, reviewRequiredCount],
  );

  const tableRows = useMemo((): DocumentCaptureReviewRow[] => {
    return lines.map((line) => {
      const decision = lineDecisions[line.id];
      const candidates = candidatesByLineId[line.id] ?? [];
      const method =
        candidates[0]?.method ??
        inferMatchMethod({ matchStatus: line.match_status, matchConfidence: line.match_confidence });
      const needsReview = lineRequiresReview({
        matchStatus: line.match_status,
        matchConfidence: line.match_confidence,
        method,
      });
      const action = decision?.action ?? "skip";

      return {
        id: line.id,
        needsReview,
        cells: {
          article: (
            <div>
              <div className="font-medium">{line.extracted_description}</div>
              <div className="text-xs text-[color:var(--cab-text-muted)]">{line.raw_code ?? "—"}</div>
            </div>
          ),
          match: (
            <div>
              <div>{matchStatusLabel(line.match_status)}</div>
              {needsReview ? (
                <span className="text-xs text-amber-700 dark:text-amber-300">Revisione</span>
              ) : null}
            </div>
          ),
          ordered: <span className="tabular-nums">{line.extracted_quantity}</span>,
          received: (
            <input
              type="number"
              min={0}
              step={1}
              className="w-16 rounded border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-1 py-0.5"
              value={line.received_quantity}
              disabled={!canWrite || line.apply_status === "applied"}
              aria-label={`Quantità ricevuta riga ${line.line_index + 1}`}
              onChange={(e) => onLineQtyChange(line.id, Number(e.target.value))}
            />
          ),
          action:
            canWrite && line.apply_status !== "applied" ? (
              <div className="space-y-1">
                <EntityMatcher
                  label="Azione riga"
                  value={action}
                  options={[
                    { value: "add", label: "Aggiungi" },
                    { value: "create", label: "Crea articolo" },
                    { value: "skip", label: "Salta" },
                  ]}
                  onChange={(v) =>
                    onLineDecisionChange(line.id, {
                      action: v as InventoryLineDecision["action"],
                    })
                  }
                />
                {action === "add" && candidates.length > 0 ? (
                  <EntityMatcher
                    label="Articolo catalogo"
                    value={decision?.manualMatchItemId ?? line.matched_item_id ?? ""}
                    options={candidates.map((c) => ({
                      value: c.itemId,
                      label: c.label.slice(0, 40),
                    }))}
                    onChange={(v) => onLineDecisionChange(line.id, { manualMatchItemId: v || undefined })}
                  />
                ) : null}
                {action === "create" ? (
                  <input
                    type="text"
                    placeholder="Codice"
                    className="w-full max-w-[9rem] rounded border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-1 py-0.5 text-xs"
                    value={decision?.newItemCodice ?? line.raw_code ?? ""}
                    aria-label="Codice nuovo articolo"
                    onChange={(e) => onLineDecisionChange(line.id, { newItemCodice: e.target.value })}
                  />
                ) : null}
              </div>
            ) : (
              actionLabel(action)
            ),
          confidence: <CaptureConfidenceBadge value={line.match_confidence} />,
        },
      };
    });
  }, [
    canWrite,
    candidatesByLineId,
    lineDecisions,
    lines,
    onLineDecisionChange,
    onLineQtyChange,
  ]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3 text-sm">
        <div className="flex items-baseline gap-x-4 gap-y-1 min-w-0 flex-nowrap sm:flex-wrap">
          <span className="font-semibold">DDT {document.document_number ?? "—"}</span>
          <span className="text-[color:var(--cab-text-muted)]">{document.supplier_label ?? "Fornitore non rilevato"}</span>
          <span className="text-[color:var(--cab-text-muted)]">{document.document_date ?? "Data non rilevata"}</span>
          <span className="text-[color:var(--cab-text-muted)]">{inventoryDocumentStatusLabel(document.status)}</span>
        </div>
        {document.document_ai_confidence != null ? (
          <p className={`mt-2 text-xs ${caution ? "text-amber-700 dark:text-amber-300" : "text-[color:var(--cab-text-muted)]"}`}>
            Confidence documento: {Math.round(document.document_ai_confidence * 100)}%
            {caution ? " — controllo approfondito consigliato" : ""}
            {document.document_ai_confidence < DOCUMENT_CONFIDENCE_CAUTION_THRESHOLD
              ? " — revisione manuale consigliata"
              : ""}
          </p>
        ) : null}
        <div className="mt-1">
          <CaptureReviewStateBanner summary={reviewSummary} />
        </div>
      </div>

      <DocumentCaptureReviewTable
        columns={inventoryReceivingCaptureAdapter.review.columns}
        rows={tableRows}
      />

      {showApplyButton && canWrite && document.status !== "APPLIED" ? (
        <button type="button" className={dsBtnPrimary} disabled={applying} onClick={onApply}>
          {applying
            ? inventoryReceivingCaptureAdapter.apply.confirmLoadingLabel
            : inventoryReceivingCaptureAdapter.apply.confirmLabel}
        </button>
      ) : null}
      {error ? <p className="text-sm text-[color:var(--cab-danger)]">{error}</p> : null}
    </div>
  );
}
