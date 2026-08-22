"use client";

import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";
import type { ReportDrillDownRow } from "@/lib/report/drilldown/types";

function formatRowDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ReportDrillDownTable({
  rows,
  onRowClick,
  hasMore,
  onLoadMore,
  loadingMore,
}: {
  rows: readonly ReportDrillDownRow[];
  onRowClick: (row: ReportDrillDownRow) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[color:var(--cab-text-muted)]">
        Nessun record per i criteri selezionati
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="overflow-x-auto rounded-lg border border-[color:var(--cab-border)]">
        <table className="w-full min-w-[20rem] text-sm">
          <thead className="sticky top-0 z-[1] bg-[color:var(--cab-card)] text-left text-xs uppercase tracking-wide text-[color:var(--cab-text-muted)] shadow-[0_1px_0_var(--cab-border)]">
            <tr>
              <th className="px-3 py-2">Record</th>
              <th className="hidden px-3 py-2 sm:table-cell">Dettaglio</th>
              <th className="px-3 py-2 text-right">Importo/Qty</th>
              <th className="hidden px-3 py-2 md:table-cell">Data</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-[color:var(--cab-border)] hover:bg-[color:var(--cab-surface-muted)]/60"
                onClick={() => onRowClick(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Apri ${row.label}`}
              >
                <td className={gestionaleListTableTd}>
                  <span className="font-medium">{row.label}</span>
                </td>
                <td className={`${gestionaleListTableTd} hidden sm:table-cell text-[color:var(--cab-text-muted)]`}>
                  {row.sublabel ?? row.status ?? "—"}
                </td>
                <td className={`${gestionaleListTableTd} text-right tabular-nums`}>
                  {row.amount != null ? formatReportMetricValue(row.amount, "currency") : "—"}
                </td>
                <td className={`${gestionaleListTableTd} hidden md:table-cell tabular-nums text-[color:var(--cab-text-muted)]`}>
                  {formatRowDate(row.date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore ? (
        <button
          type="button"
          className="w-full rounded-lg border border-[color:var(--cab-border)] py-2 text-sm font-medium hover:bg-[color:var(--cab-surface-muted)]"
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Caricamento…" : "Carica altri"}
        </button>
      ) : null}
    </div>
  );
}
