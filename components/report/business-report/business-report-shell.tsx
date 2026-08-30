"use client";

import { Button } from "@/components/design-system/button";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { BusinessReportDetail } from "@/components/report/business-report/business-report-detail";
import { BusinessReportHistory } from "@/components/report/business-report/business-report-history";
import {
  useBusinessReportGenerate,
  useBusinessReportQuery,
} from "@/components/report/business-report/use-business-report-query";
import { resolveBusinessReportEnabledClient } from "@/lib/feature-flags/report-v2-flag";
import { useState } from "react";

export function BusinessReportShell() {
  const enabled = resolveBusinessReportEnabledClient();
  const { data, isLoading, isError } = useBusinessReportQuery();
  const generate = useBusinessReportGenerate();
  const [showHistory, setShowHistory] = useState(false);

  if (!enabled) return null;

  return (
    <ReportAnalysisSectionShell
      title="Interpretazione della situazione"
      subtitle="Business Report AI — sintesi per la direzione"
      persistKey="bi-business-report"
    >
      <div className="min-w-0 space-y-3" data-testid="business-report-shell">
        <div className="flex gap-2 flex-nowrap sm:flex-wrap">
          <Button
            size="sm"
            disabled={generate.isPending}
            onClick={() => generate.mutate(false)}
            data-testid="business-report-generate"
          >
            {generate.isPending ? "Generazione…" : "Genera report"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={generate.isPending || !data}
            onClick={() => generate.mutate(true)}
            data-testid="business-report-regenerate"
          >
            Rigenera
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "Nascondi storico" : "Storico"}
          </Button>
        </div>

        {generate.isError && (
          <ShellCard title="Errore generazione">
            <p className="text-sm text-[color:var(--cab-danger)]">
              {generate.error?.message === "rate_limited"
                ? "Troppe richieste ravvicinate. Riprova tra qualche minuto."
                : generate.error?.message ?? "Generazione non riuscita."}
            </p>
          </ShellCard>
        )}

        {generate.isSuccess && generate.data?.ephemeral ? (
          <p
            className="rounded-md border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] px-3 py-2 text-xs text-[color:var(--cab-text-muted)]"
            data-testid="business-report-ephemeral"
          >
            Report generato senza storico: applica la migrazione{" "}
            <code className="text-[10px]">report_runs</code> al database per abilitare cache e storico.
          </p>
        ) : null}

        {isLoading && <LoadingSkeletonBlock className="h-32" />}
        {isError && (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun report disponibile per il periodo.</p>
        )}

        {data && <BusinessReportDetail report={data} />}

        {showHistory && <BusinessReportHistory />}
      </div>
    </ReportAnalysisSectionShell>
  );
}
