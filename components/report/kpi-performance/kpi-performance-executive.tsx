"use client";

import { ReportKpiCard } from "@/components/report/report-kpi-card";
import type { KpiPerformanceExecutiveCard } from "@/lib/report/kpi-performance/kpi-performance-types";
import type { KpiCompareRow } from "@/lib/report/build-report-model";

function toCompareRows(card: KpiPerformanceExecutiveCard): KpiCompareRow[] | null {
  if (card.comparePct == null && card.compareDelta == null) return null;
  return [
    {
      label: "vs confronto",
      deltaAbs: card.compareDelta ?? null,
      deltaPct: card.comparePct ?? null,
      invert: card.id === "cost",
    },
  ];
}

export function KpiPerformanceExecutive({ cards }: { cards: KpiPerformanceExecutiveCard[] }) {
  const hero = cards.find((c) => c.id === "disp");
  const rest = cards.filter((c) => c.id !== "disp");

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {hero ? (
        <div className="min-w-0 sm:col-span-2 xl:col-span-2">
          <ReportKpiCard
            label={hero.label}
            value={hero.value}
            sub={hero.sub}
            compareRows={toCompareRows(hero)}
            hero
          />
        </div>
      ) : null}
      {rest.map((c) => (
        <div key={c.id} className="min-w-0 xl:col-span-1">
          <ReportKpiCard label={c.label} value={c.value} sub={c.sub} compareRows={toCompareRows(c)} />
        </div>
      ))}
    </div>
  );
}
