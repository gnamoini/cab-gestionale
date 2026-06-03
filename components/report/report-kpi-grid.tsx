"use client";

import type { KpiCardModel } from "@/lib/report/build-report-model";
import { ReportKpiCard } from "@/components/report/report-kpi-card";

export function ReportKpiGrid({ items }: { items: KpiCardModel[] }) {
  const hero = items.find((k) => k.id === "lav-periodo");
  const rest = items.filter((k) => k.id !== "lav-periodo");

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {hero ? (
        <div className="min-w-0 sm:col-span-2 xl:col-span-2">
          <ReportKpiCard
            label={hero.label}
            value={hero.value}
            sub={hero.sub}
            compareRows={hero.compareRows}
            spark={hero.spark}
            hero
          />
        </div>
      ) : null}
      {rest.map((k) => (
        <div key={k.id} className="min-w-0 xl:col-span-1">
          <ReportKpiCard
            label={k.label}
            value={k.value}
            sub={k.sub}
            compareRows={k.compareRows}
            spark={k.spark}
          />
        </div>
      ))}
    </div>
  );
}
