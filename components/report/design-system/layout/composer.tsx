"use client";

import type { ReactNode } from "react";
import {
  layoutGridClass,
  layoutMainClass,
  layoutSideClass,
  type ChartLayoutDecision,
} from "@/lib/report/ui/report-layout-rules";

export function ReportLayoutRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`flex min-w-0 flex-col gap-4 ${className}`.trim()}>{children}</div>;
}

export function ReportLayoutKpiStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
  );
}

export function ReportLayoutMainAside({
  decision,
  main,
  aside,
}: {
  decision: ChartLayoutDecision;
  main: ReactNode;
  aside?: ReactNode;
}) {
  const hasSide = decision.suggestSidePanel && aside != null;
  return (
    <div className={layoutGridClass(decision.mainSpan, decision.sideSpan, hasSide)}>
      <div className={layoutMainClass(decision)}>{main}</div>
      {hasSide ? <div className={layoutSideClass(decision)}>{aside}</div> : null}
    </div>
  );
}

export function ReportLayoutSplit({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">{left}{right}</div>
  );
}

export function ReportLayoutDetail({ children }: { children: ReactNode }) {
  return <div className="min-w-0 w-full">{children}</div>;
}
