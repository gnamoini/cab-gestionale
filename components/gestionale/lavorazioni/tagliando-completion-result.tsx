"use client";

import type { FullPresetSnapshot } from "@/lib/maintenance-plans/build-full-preset-snapshot";
import { snapshotDisplayName } from "@/lib/maintenance-plans/build-full-preset-snapshot";
import { resolveCompliancePct } from "@/lib/maintenance-plans/resolve-compliance-pct";
import { parseComplianceReview } from "@/lib/maintenance-plans/resolve-compliance-pct";
import { dsBtnNeutral } from "@/lib/ui/design-system";

export function TagliandoCompletionResult({
  snapshot,
  complianceAuto,
  diffCount,
  complianceReviewRaw,
  onViewDetail,
}: {
  snapshot: FullPresetSnapshot | null;
  complianceAuto: number | null;
  diffCount: number;
  complianceReviewRaw?: unknown;
  onViewDetail?: () => void;
}) {
  const effective = resolveCompliancePct(complianceAuto, parseComplianceReview(complianceReviewRaw));
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-950">
      <p className="font-semibold">Tagliando registrato · {snapshotDisplayName(snapshot)}</p>
      {effective != null ? (
        <p className="mt-1">
          Compliance: <strong>{effective}%</strong>
          {diffCount > 0 ? ` · ${diffCount} differenza/e rilevata/e` : null}
        </p>
      ) : (
        <p className="mt-1 text-emerald-900">Nessun preset — compliance non calcolata.</p>
      )}
      {onViewDetail ? (
        <button type="button" className={`${dsBtnNeutral} mt-2 text-xs`} onClick={onViewDetail}>
          Visualizza dettaglio
        </button>
      ) : null}
    </div>
  );
}
