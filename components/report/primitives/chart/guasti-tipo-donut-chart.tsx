"use client";

import { memo } from "react";
import { ReportBklitDonut } from "@/components/report/bklit/report-bklit-charts";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import { reportBklitSeriesColor } from "@/lib/report/ui/bklit-adapters";

function GuastiTipoDonutChartInner({
  items,
  ariaLabel = "Guasti per tipo attrezzatura",
}: {
  items: readonly { tipo: string; count: number }[];
  ariaLabel?: string;
}) {
  const data = items.filter((i) => i.count > 0).slice(0, 8);
  const total = data.reduce((s, i) => s + i.count, 0);
  if (total <= 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun evento rilevato.</p>;
  }

  const slices = data.map((item, idx) => ({
    label: item.tipo,
    value: item.count,
    color: reportBklitSeriesColor(idx),
  }));

  return (
    <div className={reportChartShellClass}>
      <ReportBklitDonut slices={slices} centerLabel="eventi" ariaLabel={ariaLabel} />
    </div>
  );
}

export const GuastiTipoDonutChart = memo(GuastiTipoDonutChartInner);
