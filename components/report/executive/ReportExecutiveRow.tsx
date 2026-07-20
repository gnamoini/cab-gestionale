"use client";

import type { ExecutiveCardDto } from "@/lib/report/executive/types";
import { ExecutiveKpiCard } from "@/components/report/executive/ExecutiveKpiCard";
import { LoadingErrorState } from "@/components/design-system";

export function ReportExecutiveRow({
  cards,
  loading,
  error,
}: {
  cards: ExecutiveCardDto[] | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <LoadingErrorState
        title="Executive KPI non disponibili"
        description={error}
      />
    );
  }

  if (!cards?.length) {
    return null;
  }

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.metricId} className="min-w-0">
          <ExecutiveKpiCard card={card} />
        </div>
      ))}
    </div>
  );
}
