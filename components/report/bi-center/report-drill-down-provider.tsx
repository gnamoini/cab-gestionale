"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { buildAnalyticsPeriodFromContext } from "@/components/report/analytics/report-period-to-analytics";
import { mapUiCompareToEnvelope } from "@/components/report/bi-center/drill-down/compare-mode-bridge";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { ReportDrillDownPanel } from "@/components/report/bi-center/drill-down/report-drill-down-panel";
import { drillDownRefToContext, insightDrillDownToContext } from "@/lib/report/drilldown/drill-down-ref-bridge";
import { isDrilldownSupported } from "@/lib/report/drilldown/drilldown-metric-registry";
import type { DrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import type {
  ReportDrillDownContext,
  ReportDrillDownRecordTarget,
  ReportDrillDownSource,
} from "@/lib/report/drilldown/types";

type ReportDrillDownApi = {
  openKpiDrillDown: (ctx: Omit<ReportDrillDownContext, "source"> & { source?: ReportDrillDownSource }) => void;
  openChartDrillDown: (ctx: Omit<ReportDrillDownContext, "source">) => void;
  openBreakdownDrillDown: (ctx: Omit<ReportDrillDownContext, "source">) => void;
  openInsightDrillDown: (ctx: ReportDrillDownContext) => void;
  openFromDrillDownRef: (ref: DrillDownRef, source: ReportDrillDownSource) => void;
  closeDrillDown: () => void;
  openRecordDetail: (target: ReportDrillDownRecordTarget) => void;
  isOpen: boolean;
  context: ReportDrillDownContext | null;
  isDrilldownSupported: (metricId: string) => boolean;
};

const ReportDrillDownContextReact = createContext<ReportDrillDownApi | null>(null);

function buildFullContext(
  partial: ReportDrillDownContext,
  periodCtx: ReturnType<typeof useReportPeriodContext>,
): ReportDrillDownContext {
  return {
    ...partial,
    period: partial.period ?? buildAnalyticsPeriodFromContext(periodCtx),
    compareMode: partial.compareMode ?? mapUiCompareToEnvelope(periodCtx.compareMode),
  };
}

function writeDrillUrl(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: URLSearchParams,
  ctx: ReportDrillDownContext | null,
) {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("drillMetric");
  params.delete("drillDimension");
  params.delete("drillValue");
  if (ctx) {
    params.set("drillMetric", ctx.metricId);
    if (ctx.dimension) params.set("drillDimension", ctx.dimension);
    if (ctx.dimensionValue) params.set("drillValue", ctx.dimensionValue);
  }
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}

export function ReportDrillDownProvider({ children }: { children: ReactNode }) {
  const periodCtx = useReportPeriodContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const triggerRef = useRef<HTMLElement | null>(null);
  const [context, setContext] = useState<ReportDrillDownContext | null>(null);
  const [open, setOpen] = useState(false);

  const openWithContext = useCallback(
    (next: ReportDrillDownContext) => {
      if (!isDrilldownSupported(next.metricId)) return;
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const full = buildFullContext(next, periodCtx);
      setContext(full);
      setOpen(true);
      writeDrillUrl(router, pathname, new URLSearchParams(searchParams.toString()), full);
    },
    [periodCtx, pathname, router, searchParams],
  );

  const closeDrillDown = useCallback(() => {
    setOpen(false);
    setContext(null);
    writeDrillUrl(router, pathname, new URLSearchParams(searchParams.toString()), null);
  }, [pathname, router, searchParams]);

  const api = useMemo<ReportDrillDownApi>(
    () => ({
      openKpiDrillDown: (ctx) => openWithContext({ ...ctx, source: ctx.source ?? "kpi" }),
      openChartDrillDown: (ctx) => openWithContext({ ...ctx, source: "chart" }),
      openBreakdownDrillDown: (ctx) => openWithContext({ ...ctx, source: "breakdown" }),
      openInsightDrillDown: (ctx) => openWithContext({ ...ctx, source: "insight" }),
      openFromDrillDownRef: (ref, source) => {
        const ctx =         drillDownRefToContext(
          ref,
          buildAnalyticsPeriodFromContext(periodCtx),
          mapUiCompareToEnvelope(periodCtx.compareMode),
          source,
        );
        openWithContext(ctx);
      },
      closeDrillDown,
      openRecordDetail: () => {},
      isOpen: open,
      context,
      isDrilldownSupported,
    }),
    [closeDrillDown, context, open, openWithContext, periodCtx],
  );

  return (
    <ReportDrillDownContextReact.Provider value={api}>
      {children}
      <ReportDrillDownPanel
        open={open}
        context={context}
        onClose={closeDrillDown}
        restoreFocusRef={triggerRef as RefObject<HTMLElement | null>}
      />
    </ReportDrillDownContextReact.Provider>
  );
}

export function useReportDrillDown(): ReportDrillDownApi {
  const ctx = useContext(ReportDrillDownContextReact);
  if (!ctx) throw new Error("useReportDrillDown requires ReportDrillDownProvider");
  return ctx;
}

export function useOptionalReportDrillDown(): ReportDrillDownApi | null {
  return useContext(ReportDrillDownContextReact);
}

export { insightDrillDownToContext };
