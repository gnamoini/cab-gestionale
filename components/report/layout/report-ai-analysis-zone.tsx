"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { Button } from "@/components/design-system/button";
import { GestionaleAiActionButton } from "@/components/design-system/gestionale-ai-action-button";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";
import { ShellCard } from "@/components/gestionale/shell-card";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-gate";
import { reportSubsectionTitleClass, reportZoneShellClass } from "@/components/report/report-ui-tokens";
import { formatReportAnalysisPlainText } from "@/lib/report/report-analysis/format-report-analysis-plain-text";
import { useReportAnalysis } from "@/lib/report/report-analysis/use-report-analysis";
import type { ReportAnalysisConfidenza, ReportAnalysisGravita } from "@/lib/report/report-analysis/report-analysis-schema";
import type { ReportModel } from "@/lib/report/build-report-model";
import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import type {
  TopClienteReportRow,
  TopMezzoReportRow,
  TopRicambioReportRow,
} from "@/lib/report/report-classifiche";
import type { ReportIntegrityBadgeView } from "@/lib/report/report-integrity-badge-model";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const gravitaToneClass: Record<ReportAnalysisGravita | "warning" | "critical", string> = {
  info: "border-[color:var(--cab-border)] bg-[var(--cab-card)]",
  warning:
    "border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-card))]",
  critical:
    "border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-card))]",
};

const confidenzaToneClass: Record<ReportAnalysisConfidenza, string> = {
  alta: "text-[color:var(--cab-text-muted)]",
  media:
    "text-[color:color-mix(in_srgb,var(--cab-warning)_70%,var(--cab-text-muted))]",
  bassa: "text-[color:var(--cab-text-muted)] italic",
};

function ConfidenzaBadge({ confidenza }: { confidenza: ReportAnalysisConfidenza }) {
  return (
    <span className={`text-[10px] font-medium uppercase tracking-wide ${confidenzaToneClass[confidenza]}`}>
      Confidenza: {confidenza}
    </span>
  );
}

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AnalysisItemList({ items }: { items: Array<{ key: string; node: ReactNode }> }) {
  if (items.length === 0) return null;
  return (
    <ul className="min-w-0 space-y-2">
      {items.map((item) => (
        <li key={item.key}>{item.node}</li>
      ))}
    </ul>
  );
}

export function ReportAiAnalysisZone({
  preset,
  compareMode,
  filterRange,
  compareRange,
  model,
  integrityView,
  tops,
  snapshotFingerprint,
}: {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  filterRange: DateRange;
  compareRange: DateRange | null;
  model: ReportModel;
  integrityView: ReportIntegrityBadgeView;
  tops: {
    mezzi: TopMezzoReportRow[];
    clienti: TopClienteReportRow[];
    ricambi: TopRicambioReportRow[];
  };
  snapshotFingerprint: string;
}) {
  const { perf, perfLoading } = useReportPerformanceContext();
  const gestToast = useGestionaleToast();

  const analysis = useReportAnalysis({
    preset,
    compareMode,
    filterRange,
    compareRange,
    model,
    perf,
    integrityView,
    tops,
    snapshotFingerprint,
    perfReady: !perfLoading && perf != null,
  });

  const copyAnalysis = useCallback(async () => {
    if (!analysis.data) return;
    try {
      await navigator.clipboard.writeText(formatReportAnalysisPlainText(analysis.data));
      gestToast.successOnce("report-ai-copy", "Analisi copiata negli appunti.");
    } catch {
      gestToast.warning("Copia non disponibile: seleziona e copia manualmente il testo.");
    }
  }, [analysis.data, gestToast]);

  const headerActions = useMemo(() => {
    if (!analysis.data || (analysis.status !== "success" && analysis.status !== "stale")) {
      return null;
    }
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => void copyAnalysis()} disabled={!analysis.data}>
          Copia
        </Button>
        <GestionaleAiActionButton variant="secondary" size="sm" onClick={() => void analysis.generate()} disabled={!analysis.canGenerate}>
          Rigenera
        </GestionaleAiActionButton>
      </div>
    );
  }, [analysis, copyAnalysis]);

  const showEmpty =
    analysis.status === "idle" || (analysis.status === "error" && !analysis.data);
  const showLoading = (analysis.isLoading || perfLoading || !perf) && !analysis.data;
  const showResults =
    analysis.data && (analysis.status === "success" || analysis.status === "stale" || analysis.isLoading);

  const statusHint = analysis.isStale
    ? "Dati aggiornati — rigenera l'analisi"
    : analysis.isLoading
      ? "Analisi in corso…"
      : null;

  return (
    <ShellCard
      id="report-ai-analysis"
      title="Analisi AI"
      subtitle="Report intelligente su KPI, trend e criticità del periodo selezionato"
      className={reportZoneShellClass}
      headerActions={headerActions}
    >
      {statusHint ? (
        <p className="mb-4 text-xs text-[color:var(--cab-text-muted)]" role="status">
          {statusHint}
        </p>
      ) : null}

      {showLoading ? (
        <div className="min-w-0 space-y-3" aria-busy="true">
          <LoadingSkeletonBlock className="min-h-[3rem]" />
          <LoadingSkeletonBlock className="min-h-[6rem]" />
          <LoadingSkeletonBlock className="min-h-[8rem]" />
        </div>
      ) : null}

      {showEmpty && !showLoading ? (
        <div className="min-w-0 space-y-4">
          <p className="text-sm leading-relaxed text-[color:var(--cab-text-muted)]">
            L&apos;intelligenza artificiale analizza lavorazioni, flotta, magazzino e costi per produrre un
            report manageriale strutturato. La generazione avviene su richiesta tramite Gemini.
          </p>
          {analysis.error ? (
            <div className="min-w-0 space-y-3">
              <p className="text-sm text-[color:var(--cab-danger)]" role="alert">
                {analysis.error.message}
              </p>
              <GestionaleAiActionButton
                variant="secondary"
                size="sm"
                onClick={() => void analysis.retry()}
                disabled={!analysis.canGenerate}
              >
                Riprova
              </GestionaleAiActionButton>
            </div>
          ) : null}
          <GestionaleAiActionButton
            onClick={() => void analysis.generate()}
            disabled={!analysis.canGenerate}
            loading={analysis.isLoading}
          >
            Genera analisi
          </GestionaleAiActionButton>
        </div>
      ) : null}

      {showResults && analysis.data ? (
        <div className="min-w-0 space-y-6">
          {analysis.isStale ? (
            <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-warning)_30%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_6%,var(--cab-card))] px-3 py-2.5">
              <p className="min-w-0 flex-1 text-xs text-[color:var(--cab-text)]">
                I dati del report sono cambiati rispetto all&apos;ultima analisi.
              </p>
              <GestionaleAiActionButton
                variant="secondary"
                size="sm"
                onClick={() => void analysis.generate()}
                disabled={!analysis.canGenerate}
                loading={analysis.isLoading}
              >
                Rigenera
              </GestionaleAiActionButton>
            </div>
          ) : null}

          {analysis.error ? (
            <div className="min-w-0 space-y-2">
              <p className="text-sm text-[color:var(--cab-danger)]" role="alert">
                {analysis.error.message}
              </p>
              <GestionaleAiActionButton
                variant="secondary"
                size="sm"
                onClick={() => void analysis.retry()}
                disabled={!analysis.canGenerate}
              >
                Riprova
              </GestionaleAiActionButton>
            </div>
          ) : null}

          <p className="text-xs text-[color:var(--cab-text-muted)]">
            Ultima generazione: {formatGeneratedAt(analysis.data.generatedAt)}
          </p>

          <section className="min-w-0 space-y-2" aria-labelledby="report-ai-exec-summary">
            <h2 id="report-ai-exec-summary" className={reportSubsectionTitleClass}>
              Executive Summary
            </h2>
            <p className="text-sm leading-relaxed text-[color:var(--cab-text)]">
              {analysis.data.executiveSummary}
            </p>
          </section>

          {analysis.data.dataQualityNotes && analysis.data.dataQualityNotes.length > 0 ? (
            <section className="min-w-0 space-y-2" aria-labelledby="report-ai-quality">
              <h2 id="report-ai-quality" className={reportSubsectionTitleClass}>
                Qualità dati
              </h2>
              <ul className="min-w-0 space-y-1 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
                {analysis.data.dataQualityNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="min-w-0 space-y-3" aria-labelledby="report-ai-kpi">
            <h2 id="report-ai-kpi" className={reportSubsectionTitleClass}>
              KPI Principali
            </h2>
            <AnalysisItemList
              items={analysis.data.kpiPrincipali.map((k, i) => ({
                key: `kpi-${i}`,
                node: (
                  <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2.5">
                    <p className="text-sm font-semibold text-[color:var(--cab-text)]">
                      {k.label}: {k.valore}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
                      {k.osservazione}
                    </p>
                  </div>
                ),
              }))}
            />
          </section>

          {analysis.data.anomalieRilevate.length > 0 ? (
            <section className="min-w-0 space-y-3" aria-labelledby="report-ai-anomalie">
              <h2 id="report-ai-anomalie" className={reportSubsectionTitleClass}>
                Anomalie Rilevate
              </h2>
              <AnalysisItemList
                items={analysis.data.anomalieRilevate.map((a, i) => ({
                  key: `anom-${i}`,
                  node: (
                    <div className={`rounded-[var(--ds-radius-lg)] border px-3 py-2.5 ${gravitaToneClass[a.gravita]}`}>
                      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold text-[color:var(--cab-text)]">{a.titolo}</p>
                        <ConfidenzaBadge confidenza={a.confidenza} />
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{a.dettaglio}</p>
                    </div>
                  ),
                }))}
              />
            </section>
          ) : null}

          {analysis.data.trendPositivi.length > 0 ? (
            <section className="min-w-0 space-y-3" aria-labelledby="report-ai-trend">
              <h2 id="report-ai-trend" className={reportSubsectionTitleClass}>
                Trend Positivi
              </h2>
              <AnalysisItemList
                items={analysis.data.trendPositivi.map((t, i) => ({
                  key: `trend-${i}`,
                  node: (
                    <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2.5">
                      <p className="text-sm font-semibold text-[color:var(--cab-text)]">{t.titolo}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{t.dettaglio}</p>
                    </div>
                  ),
                }))}
              />
            </section>
          ) : null}

          {analysis.data.criticita.length > 0 ? (
            <section className="min-w-0 space-y-3" aria-labelledby="report-ai-criticita">
              <h2 id="report-ai-criticita" className={reportSubsectionTitleClass}>
                Criticità
              </h2>
              <AnalysisItemList
                items={analysis.data.criticita.map((c, i) => ({
                  key: `crit-${i}`,
                  node: (
                    <div className={`rounded-[var(--ds-radius-lg)] border px-3 py-2.5 ${gravitaToneClass[c.gravita]}`}>
                      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold text-[color:var(--cab-text)]">{c.titolo}</p>
                        <ConfidenzaBadge confidenza={c.confidenza} />
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{c.dettaglio}</p>
                    </div>
                  ),
                }))}
              />
            </section>
          ) : null}

          {analysis.data.suggerimentiOperativi.length > 0 ? (
            <section className="min-w-0 space-y-3" aria-labelledby="report-ai-sugg">
              <h2 id="report-ai-sugg" className={reportSubsectionTitleClass}>
                Suggerimenti Operativi
              </h2>
              <AnalysisItemList
                items={analysis.data.suggerimentiOperativi.map((s, i) => ({
                  key: `sugg-${i}`,
                  node: (
                    <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2.5">
                      <p className="text-sm font-semibold text-[color:var(--cab-text)]">
                        [{s.priorita}] {s.azione}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{s.motivazione}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
                        Impatto atteso: {s.impattoAtteso}
                      </p>
                    </div>
                  ),
                }))}
              />
            </section>
          ) : null}

          {analysis.data.prioritaImmediate.length > 0 ? (
            <section className="min-w-0 space-y-3" aria-labelledby="report-ai-prio">
              <h2 id="report-ai-prio" className={reportSubsectionTitleClass}>
                Priorità Immediate
              </h2>
              <AnalysisItemList
                items={analysis.data.prioritaImmediate.map((p, i) => ({
                  key: `prio-${i}`,
                  node: (
                    <div className="rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_4%,var(--cab-card))] px-3 py-2.5">
                      <p className="text-sm font-semibold text-[color:var(--cab-text)]">{p.azione}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">Entro: {p.entro}</p>
                    </div>
                  ),
                }))}
              />
            </section>
          ) : null}

          <section className="min-w-0 space-y-2" aria-labelledby="report-ai-valutazione">
            <h2 id="report-ai-valutazione" className={reportSubsectionTitleClass}>
              Valutazione Generale
            </h2>
            <p className="text-sm font-semibold text-[color:var(--cab-text)]">
              Punteggio: {analysis.data.valutazioneGenerale.punteggio}/10
            </p>
            <p className="text-sm leading-relaxed text-[color:var(--cab-text-muted)]">
              {analysis.data.valutazioneGenerale.giudizio}
            </p>
          </section>

          <p className="border-t border-[color:var(--cab-border)] pt-4 text-[10px] leading-snug text-[color:var(--cab-text-muted)]">
            Analisi generativa basata sui KPI del periodo (Gemini) — verificare sempre i dati operativi prima di
            decisioni operative.
          </p>
        </div>
      ) : null}
    </ShellCard>
  );
}
