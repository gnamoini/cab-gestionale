"use client";

import { useMemo } from "react";
import { GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { GestionaleListTable, GestionaleListTableRow } from "@/components/gestionale/global-table/gestionale-list-table-shell";
import { useReportDensity } from "@/components/report/design-system/internal/use-report-density";
import { formatReportMetricValue } from "@/lib/report/metrics/report-value-formatter";
import { getReportTableConfig } from "@/lib/report/design-system/table-configs";
import { gestionaleListTableRowClass, gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";

export function ReportDataTable({
  configId,
  rows,
}: {
  configId: string;
  rows: readonly Record<string, unknown>[];
}) {
  const config = getReportTableConfig(configId);
  const { tableRowPadding } = useReportDensity();

  const headRow = useMemo(
    () =>
      config.columns.map((col) => (
        <GlobalTableHeadLabel key={col.id} label={col.label} align={col.align ?? "left"} />
      )),
    [config.columns],
  );

  if (rows.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato nel periodo.</p>;
  }

  return (
    <GestionaleListTable headRow={headRow} fixed>
      {rows.map((row, i) => (
        <GestionaleListTableRow key={String(row.id ?? row.rank ?? i)} className={gestionaleListTableRowClass}>
          {config.columns.map((col) => {
            const raw = row[col.id];
            const text =
              col.formatter != null && typeof raw === "number"
                ? formatReportMetricValue(raw, col.formatter)
                : raw == null
                  ? "—"
                  : String(raw);
            const align =
              col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
            return (
              <td key={col.id} className={`${gestionaleListTableTd} ${tableRowPadding} ${align}`}>
                {text}
              </td>
            );
          })}
        </GestionaleListTableRow>
      ))}
    </GestionaleListTable>
  );
}
