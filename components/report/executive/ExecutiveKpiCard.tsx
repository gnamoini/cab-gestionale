"use client";

import type { ExecutiveCardDto } from "@/lib/report/executive/types";
import { ReportKpiCard } from "@/components/report/report-kpi-card";
import type { ReportKpiTrust } from "@/lib/report/kpi-display-clusters";

function toKpiTrust(trust: ExecutiveCardDto["trust"]): ReportKpiTrust | undefined {
  if (trust === "GREEN") return "exact";
  if (trust === "AMBER") return "partial";
  if (trust === "RED") return "snapshot";
  return undefined;
}

export function ExecutiveKpiCard({ card }: { card: ExecutiveCardDto }) {
  const trust = toKpiTrust(card.trust);
  return (
    <ReportKpiCard
      label={card.label}
      value={card.formattedValue}
      sub={card.warnings?.join(" · ")}
      compareRows={null}
      trust={trust}
      placeholder={card.trust === "AMBER"}
    />
  );
}
