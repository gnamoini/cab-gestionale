"use client";

import type { SavedKpiChart } from "@/lib/report/kpi-chart-config/contracts";
import { erpBtnNeutral } from "@/components/report/report-buttons";

export function KpiChartSavedList({
  configs,
  activeId,
  onLoad,
  onDelete,
}: {
  configs: SavedKpiChart[];
  activeId: string | null;
  onLoad: (config: SavedKpiChart) => void;
  onDelete: (configId: string) => void;
}) {
  if (configs.length === 0) {
    return (
      <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun grafico salvato.</p>
    );
  }

  return (
    <ul className="min-w-0 divide-y divide-[color:var(--cab-border)] rounded-lg border border-[color:var(--cab-border)]">
      {configs.map((cfg) => (
        <li key={cfg.id} className="flex items-center justify-between gap-2 px-3 py-2 flex-nowrap sm:flex-wrap">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[color:var(--cab-text)]">{cfg.name}</p>
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              {cfg.metricIds.length} KPI · {cfg.displayMode === "indexed" ? "Indice" : "Assoluto"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className={`${erpBtnNeutral} text-sm`}
              aria-pressed={activeId === cfg.id}
              onClick={() => onLoad(cfg)}
            >
              Carica
            </button>
            <button
              type="button"
              className={`${erpBtnNeutral} text-sm`}
              onClick={() => onDelete(cfg.id)}
            >
              Elimina
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
