"use client";

import { useState } from "react";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { LoadingButton } from "@/components/design-system";
import type { ComplianceReview, ComplianceReviewReason } from "@/lib/maintenance-plans/maintenance-task";
import { resolveCompliancePct, parseComplianceReview } from "@/lib/maintenance-plans/resolve-compliance-pct";
import { dsBtnPrimary, dsFormField, dsFormLabel } from "@/lib/ui/design-system";

const REASONS: { id: ComplianceReviewReason; label: string }[] = [
  { id: "equivalente", label: "Equivalente" },
  { id: "sostituito", label: "Sostituito" },
  { id: "rifiutato_cliente", label: "Cliente ha rifiutato" },
  { id: "non_disponibile", label: "Non disponibile" },
  { id: "altro", label: "Altro" },
];

export function TagliandoComplianceReviewPanel({
  serviceId,
  complianceAuto,
  complianceReviewRaw,
  onSaved,
}: {
  serviceId: string;
  complianceAuto: number | null;
  complianceReviewRaw?: unknown;
  onSaved?: () => void;
}) {
  const existing = parseComplianceReview(complianceReviewRaw);
  const [reason, setReason] = useState<ComplianceReviewReason>("equivalente");
  const [note, setNote] = useState("");
  const [delta, setDelta] = useState(5);
  const [pending, setPending] = useState(false);

  const effective = resolveCompliancePct(complianceAuto, existing);

  async function submit(approved: boolean) {
    setPending(true);
    try {
      const review: ComplianceReview = approved
        ? {
            approved: true,
            adjustments: [{ taskId: "manual", reason, note, delta }],
          }
        : { approved: false, adjustments: [] };
      const res = await fetch("/api/maintenance/compliance-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, review }),
      });
      if (!res.ok) throw new Error("Salvataggio fallito");
      onSaved?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--erp-border)] p-3 text-sm">
      <p>
        Compliance automatica: <strong>{complianceAuto ?? "—"}%</strong>
        {effective != null ? (
          <>
            {" "}
            · Effettiva: <strong>{effective}%</strong>
          </>
        ) : null}
      </p>
      <div className={dsFormField}>
        <label className={dsFormLabel}>Motivo revisione</label>
        <select
          className="w-full rounded border border-[var(--erp-border)] px-2 py-1"
          value={reason}
          onChange={(e) => setReason(e.target.value as ComplianceReviewReason)}
        >
          {REASONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <GestionaleTextarea value={note} onChange={setNote} rows={2} placeholder="Note" />
      <div className={dsFormField}>
        <label className={dsFormLabel}>Delta %</label>
        <input
          type="number"
          className="w-24 rounded border border-[var(--erp-border)] px-2 py-1"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
        />
      </div>
      <LoadingButton className={dsBtnPrimary} disabled={pending} onClick={() => void submit(true)}>
        Approva revisione
      </LoadingButton>
    </div>
  );
}
