"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Drawer, LoadingErrorState } from "@/components/design-system";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-size-system";
import { ReportDrillDownCompositionView, ReportDrillDownHeaderView } from "@/components/report/bi-center/drill-down/report-drill-down-header";
import { ReportDrillDownTable } from "@/components/report/bi-center/drill-down/report-drill-down-table";
import { useReportDrilldownQuery } from "@/components/report/bi-center/drill-down/use-report-drilldown-query";
import type {
  ReportDrillDownContext,
  ReportDrillDownRecordTarget,
  ReportDrillDownRequest,
  ReportDrillDownRow,
} from "@/lib/report/drilldown/types";

const LavorazioneDetailModal = dynamic(
  () =>
    import("@/components/gestionale/lavorazioni/lavorazione-detail-modal").then(
      (m) => m.LavorazioneDetailModal,
    ),
  { ssr: false },
);

function contextToRequest(ctx: ReportDrillDownContext): ReportDrillDownRequest {
  return {
    metricId: ctx.metricId,
    period: ctx.period,
    compareMode: ctx.compareMode ?? ctx.period.compareMode,
    dimension: ctx.dimension,
    dimensionValue: ctx.dimensionValue,
    filters: ctx.filters,
  };
}

function ReportDrillDownRecordHost({
  target,
  onClose,
}: {
  target: ReportDrillDownRecordTarget | null;
  onClose: () => void;
}) {
  if (!target || target.entity !== "lavorazione") return null;
  return <LavorazioneDetailModal lavorazioneId={target.id} onClose={onClose} />;
}

export function ReportDrillDownPanel({
  open,
  context,
  onClose,
  restoreFocusRef,
}: {
  open: boolean;
  context: ReportDrillDownContext | null;
  onClose: () => void;
  restoreFocusRef?: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const request = useMemo(() => (context ? contextToRequest(context) : null), [context]);
  const query = useReportDrilldownQuery(request, open && context != null);
  const [recordTarget, setRecordTarget] = useState<ReportDrillDownRecordTarget | null>(null);

  const pages = query.data?.pages ?? [];
  const first = pages[0];
  const rows = useMemo(
    () => pages.flatMap((p) => p.page?.rows ?? []),
    [pages],
  );

  const handleRowClick = useCallback(
    (row: ReportDrillDownRow) => {
      switch (row.target.entity) {
        case "lavorazione":
          setRecordTarget(row.target);
          break;
        case "fattura":
          router.push(`/fatturazione?highlight=${encodeURIComponent(row.target.id)}`);
          break;
        case "preventivo":
          router.push(`/documenti/preventivo/${encodeURIComponent(row.target.id)}/preview`);
          break;
        case "ricambio":
          router.push(`/magazzino?ricambio=${encodeURIComponent(row.target.id)}`);
          break;
        default:
          break;
      }
    },
    [router],
  );

  const title = first?.header.title ?? "Dettaglio";

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={title}
        asideClassName={resolveDrawerAsideClasses("drawerLog")}
        contentFill
        restoreFocusRef={restoreFocusRef}
        ariaLabel="Pannello drill-down report"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="report-drilldown-panel">
          {query.isLoading ? (
            <div className="space-y-2 overflow-y-auto p-4" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-[color:var(--cab-surface-muted)]" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="overflow-y-auto p-4">
              <LoadingErrorState
                title="Drill-down non disponibile"
                description={query.error?.message ?? "Errore"}
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : first ? (
            <>
              <div className="shrink-0 border-b border-[color:var(--cab-border)] px-4 pt-4">
                <ReportDrillDownHeaderView header={first.header} />
              </div>
              <div className="gestionale-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {first.drillDownKind === "composition_analysis" && first.composition ? (
                  <ReportDrillDownCompositionView components={first.composition} />
                ) : (
                  <ReportDrillDownTable
                    rows={rows}
                    onRowClick={handleRowClick}
                    hasMore={Boolean(query.hasNextPage)}
                    onLoadMore={() => void query.fetchNextPage()}
                    loadingMore={query.isFetchingNextPage}
                  />
                )}
              </div>
            </>
          ) : null}
        </div>
      </Drawer>
      {recordTarget ? (
        <ReportDrillDownRecordHost target={recordTarget} onClose={() => setRecordTarget(null)} />
      ) : null}
    </>
  );
}
