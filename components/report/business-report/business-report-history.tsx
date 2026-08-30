"use client";

import { useBusinessReportHistoryQuery } from "@/components/report/business-report/use-business-report-query";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

export function BusinessReportHistory() {
  const { data, isLoading } = useBusinessReportHistoryQuery();

  if (isLoading) return <LoadingSkeletonBlock className="h-24" />;

  const rows = data?.history ?? [];

  return (
    <div className="rounded-md border border-[color:var(--cab-border)] p-3" data-testid="business-report-history">
      <h4 className="text-sm font-semibold mb-2">Business Reports</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun report salvato.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex gap-2 justify-between flex-nowrap sm:flex-wrap">
              <span>
                {row.report_type} · {row.period_start} → {row.period_end} · v{row.generation_version}
              </span>
              <span className="text-[color:var(--cab-text-muted)] capitalize">{row.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
