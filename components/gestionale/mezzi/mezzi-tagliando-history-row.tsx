"use client";

import { useState } from "react";
import { TagliandoComplianceReviewPanel } from "@/components/gestionale/lavorazioni/tagliando-compliance-review-panel";
import { resolveCompliancePct, parseComplianceReview } from "@/lib/maintenance-plans/resolve-compliance-pct";
import { REPLACEMENT_CONDITION_LABELS } from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenanceServiceHistoryView } from "@/lib/maintenance-plans/types";
import { dsTableRow } from "@/lib/ui/design-system";

function fmtDateIt(ymd: string): string {
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}

function formatHistoryThreshold(row: MaintenanceServiceHistoryView): string {
  const km = row.kmAtService;
  if (km != null && km > 0) return `${km.toLocaleString("it-IT")} km`;
  return `${row.oreAtService.toLocaleString("it-IT")} h`;
}

export function tagliandoComplianceLabel(row: MaintenanceServiceHistoryView | undefined): string {
  if (!row) return "—";
  const compliance = resolveCompliancePct(row.complianceAuto, parseComplianceReview(row.complianceReview));
  return compliance != null ? `${compliance}%` : "—";
}

export function tagliandoRicambiLabel(row: MaintenanceServiceHistoryView | undefined): string {
  if (!row) return "—";
  const replaced = row.parts.filter((p) => p.wasReplaced).length;
  return replaced > 0 ? `${replaced} sost.` : "—";
}

export function TagliandoHistoryExpandedDetail({
  row,
  canEdit = false,
  onReviewSaved,
}: {
  row: MaintenanceServiceHistoryView;
  canEdit?: boolean;
  onReviewSaved?: () => void;
}) {
  const replaced = row.parts.filter((p) => p.wasReplaced);
  const notReplaced = row.parts.filter((p) => !p.wasReplaced);

  return (
    <div className="text-xs">
      {row.lavorazioneId ? (
        <p className="mb-2 text-[color:var(--cab-text-muted)]">
          Lavorazione collegata: <span className="font-mono">{row.lavorazioneId.slice(0, 8)}…</span>
        </p>
      ) : null}
      {row.parts.length === 0 ? (
        <p className="text-[color:var(--cab-text-muted)]">Nessun ricambio previsto nel preset.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-[color:var(--cab-text)]">Sostituiti</p>
            {replaced.length === 0 ? (
              <p className="text-[color:var(--cab-text-muted)]">Nessuno</p>
            ) : (
              <ul className="space-y-1">
                {replaced.map((p) => (
                  <li key={p.ricambioId}>
                    ✓ {p.descrizione} × {p.quantita}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1 font-semibold text-[color:var(--cab-text)]">Non sostituiti</p>
            {notReplaced.length === 0 ? (
              <p className="text-[color:var(--cab-text-muted)]">—</p>
            ) : (
              <ul className="space-y-1">
                {notReplaced.map((p) => (
                  <li key={p.ricambioId} className="text-[color:var(--cab-text-muted)]">
                    ○ {p.descrizione} × {p.quantita}
                    <span className="ml-1">({REPLACEMENT_CONDITION_LABELS[p.replacementCondition]})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {row.checklist.length > 0 ? (
        <div className="mt-3 border-t border-[color:var(--cab-border)] pt-2">
          <p className="mb-1 font-semibold text-[color:var(--cab-text)]">Checklist operativa</p>
          <ul className="space-y-1">
            {row.checklist.map((c) => (
              <li key={c.itemLabel}>
                {c.checked ? "✓" : "○"} {c.itemLabel}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {row.note ? <p className="mt-2 text-[color:var(--cab-text-muted)]">Note: {row.note}</p> : null}
      {canEdit && row.complianceAuto != null && !row.synthetic && !row.id.startsWith("synthetic:") ? (
        <div className="mt-3 border-t border-[color:var(--cab-border)] pt-2">
          <TagliandoComplianceReviewPanel
            serviceId={row.id}
            complianceAuto={row.complianceAuto}
            complianceReviewRaw={row.complianceReview}
            onSaved={onReviewSaved}
          />
        </div>
      ) : null}
    </div>
  );
}

export function MezziTagliandoHistoryRow({
  row,
  canEdit = false,
  onReviewSaved,
}: {
  row: MaintenanceServiceHistoryView;
  canEdit?: boolean;
  onReviewSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const compliance = tagliandoComplianceLabel(row);
  const displayPlan = row.versionLabel ? `${row.planNome} · ${row.versionLabel}` : row.planNome;

  return (
    <>
      <tr className={dsTableRow}>
        <td className="px-2 py-2">
          <button
            type="button"
            className="text-left font-medium text-[color:var(--cab-primary)] hover:underline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {fmtDateIt(row.performedAt)}
          </button>
        </td>
        <td className="px-2 py-2 font-mono tabular-nums">{formatHistoryThreshold(row)}</td>
        <td className="px-2 py-2">{displayPlan}</td>
        <td className="px-2 py-2 font-mono">{compliance}</td>
        <td className="px-2 py-2 text-[color:var(--cab-text-muted)]">{tagliandoRicambiLabel(row)}</td>
      </tr>
      {open ? (
        <tr className={dsTableRow}>
          <td colSpan={5} className="bg-[var(--cab-hover)]/40 px-3 py-3">
            <TagliandoHistoryExpandedDetail row={row} canEdit={canEdit} onReviewSaved={onReviewSaved} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
