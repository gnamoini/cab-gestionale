"use client";

/* eslint-disable react-hooks/preserve-manual-memoization -- lint phase2: preserve manual memoization contract */

import { useCallback, useMemo, type ReactNode } from "react";
import { Button } from "@/components/design-system/button";
import { GestionaleAiActionButton } from "@/components/design-system/gestionale-ai-action-button";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";
import { ShellCard } from "@/components/gestionale/shell-card";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import { ReportSubsection } from "@/components/report/sections/report-subsection";
import { reportZoneShellClass } from "@/components/report/report-ui-tokens";
import { formatReportAnalysisPlainText } from "@/lib/report/report-analysis/format-report-analysis-plain-text";
import { useReportAiAnalysisSource } from "@/lib/report/narrative/use-report-ai-analysis-source";
import { insightRuleLabel } from "@/lib/report/insights/insight-rule-labels";
import { OperationalBriefShell } from "@/components/report/operational-brief/operational-brief-shell";
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
import { useOperationalDiaryQuery } from "@/src/hooks/view/use-operational-diary";
import { useRbac } from "@/src/hooks/use-rbac";

function fmtDiaryYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  embed = false,
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
  embed?: boolean;
}) {
  const { perf, perfLoading } = useReportPerformanceContext();
  const gestToast = useGestionaleToast();
  const rbac = useRbac();
  const canReadDiary = rbac.canReadPage("dashboard");

  const diaryFromYmd = fmtDiaryYmd(filterRange.start);
  const diaryToYmd = fmtDiaryYmd(filterRange.end);
  const { data: diaryRows = [] } = useOperationalDiaryQuery(
    { fromYmd: diaryFromYmd, toYmd: diaryToYmd },
    { enabled: !rbac.isLoading && canReadDiary && Boolean(diaryFromYmd && diaryToYmd) },
  );
  const diaryEntries = useMemo(
    () => diaryRows.map((e) => ({ workDate: e.work_date, body: e.body })),
    [diaryRows],
  );

  const source = useReportAiAnalysisSource({
    preset,
    compareMode,
    filterRange,
    compareRange,
    model,
    perf,
    integrityView,
    tops,
    diaryEntries,
    snapshotFingerprint,
    perfReady: !perfLoading && perf != null,
  });

  const legacyAnalysis = source.type === "legacy" ? source.legacy : null;

  const copyAnalysis = useCallback(async () => {
    if (!legacyAnalysis?.data) return;
    try {
      await navigator.clipboard.writeText(formatReportAnalysisPlainText(legacyAnalysis.data));
      gestToast.successOnce("report-ai-copy", "Analisi copiata negli appunti.");
    } catch {
      gestToast.warning("Copia non disponibile: seleziona e copia manualmente il testo.");
    }
  }, [legacyAnalysis?.data, gestToast]);

  const legacyHeaderActions = useMemo(() => {
    if (!legacyAnalysis?.data || (legacyAnalysis.status !== "success" && legacyAnalysis.status !== "stale")) {
      return null;
    }
    return (
      <div className="flex min-w-0 items-center gap-2 flex-nowrap sm:flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => void copyAnalysis()} disabled={!legacyAnalysis.data}>
          Copia
        </Button>
        <GestionaleAiActionButton
          variant="secondary"
          size="sm"
          onClick={() => void legacyAnalysis.generate()}
          disabled={!legacyAnalysis.canGenerate}
        >
          Rigenera
        </GestionaleAiActionButton>
      </div>
    );
  }, [legacyAnalysis, copyAnalysis]);

  if (source.type === "operational-brief") {
    const showEmpty = !source.data && !source.loading;
    const showLoading = source.loading && !source.data;

    const briefBody = (
      <>
        {showLoading ? (
          <div className="min-w-0 space-y-3" aria-busy="true">
            <LoadingSkeletonBlock className="min-h-[3rem]" />
            <LoadingSkeletonBlock className="min-h-[6rem]" />
            <LoadingSkeletonBlock className="min-h-[8rem]" />
          </div>
        ) : null}

        {showEmpty ? (
          <div className="min-w-0 space-y-4">
            <p className="text-sm leading-relaxed text-[color:var(--cab-text-muted)]">
              Brief operativo per il responsabile officina: stato, priorità, problemi e azioni del periodo.
            </p>
            {source.error ? (
              <div className="min-w-0 space-y-3">
                <p className="text-sm text-[color:var(--cab-danger)]" role="alert">
                  {source.error}
                </p>
                <GestionaleAiActionButton variant="secondary" size="sm" onClick={() => source.refetch()}>
                  Riprova
                </GestionaleAiActionButton>
              </div>
            ) : null}
            <GestionaleAiActionButton onClick={() => source.refetch()} loading={source.loading}>
              Genera brief
            </GestionaleAiActionButton>
          </div>
        ) : null}

        {source.data ? (
          <div className="min-w-0 space-y-4">
            {source.error ? (
              <p className="text-sm text-[color:var(--cab-danger)]" role="alert">
                {source.error}
              </p>
            ) : null}
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              Ultima generazione: {formatGeneratedAt(source.data.generatedAt)}
            </p>
            <OperationalBriefShell brief={source.data} />
            <p className="text-[10px] leading-snug text-[color:var(--cab-text-muted)]">{source.data.disclaimer}</p>
          </div>
        ) : null}
      </>
    );

    const briefActions = source.data ? (
      <GestionaleAiActionButton variant="secondary" size="sm" onClick={() => source.refetch()} loading={source.loading}>
        Rigenera
      </GestionaleAiActionButton>
    ) : null;

    if (embed) {
      return (
        <div className="min-w-0 space-y-4">
          {briefActions ? <div className="flex justify-end">{briefActions}</div> : null}
          {briefBody}
        </div>
      );
    }

    return (
      <ShellCard
        id="report-ai-analysis"
        title="Brief operativo"
        subtitle="Operational Intelligence — stato, priorità e azioni del periodo"
        className={reportZoneShellClass}
        headerActions={briefActions}
      >
        {briefBody}
      </ShellCard>
    );
  }

  if (source.type === "narrative-v2") {
    const showEmpty = !source.data && !source.loading;
    const showLoading = source.loading && !source.data;

    const narrativeBody = (
      <>
        {showLoading ? (
          <div className="min-w-0 space-y-3" aria-busy="true">
            <LoadingSkeletonBlock className="min-h-[3rem]" />
            <LoadingSkeletonBlock className="min-h-[6rem]" />
            <LoadingSkeletonBlock className="min-h-[8rem]" />
          </div>
        ) : null}

        {showEmpty ? (
          <div className="min-w-0 space-y-4">
            <p className="text-sm leading-relaxed text-[color:var(--cab-text-muted)]">
              Spiegazione narrativa dei segnali decisionali del periodo. La generazione avviene su richiesta.
            </p>
            {source.error ? (
              <div className="min-w-0 space-y-3">
                <p className="text-sm text-[color:var(--cab-danger)]" role="alert">
                  {source.error}
                </p>
                <GestionaleAiActionButton variant="secondary" size="sm" onClick={() => source.refetch()}>
                  Riprova
                </GestionaleAiActionButton>
              </div>
            ) : null}
            <GestionaleAiActionButton onClick={() => source.refetch()} loading={source.loading}>
              Genera analisi
            </GestionaleAiActionButton>
          </div>
        ) : null}

        {source.data ? (
          <div className="min-w-0 space-y-4">
            {source.error ? (
              <p className="text-sm text-[color:var(--cab-danger)]" role="alert">
                {source.error}
              </p>
            ) : null}
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              Ultima generazione: {formatGeneratedAt(source.data.generatedAt)}
            </p>
            {source.data.sections.map((section) => (
              <ReportSubsection
                key={section.ruleKey}
                id={`report-narrative-${section.ruleKey}`}
                title={insightRuleLabel(section.ruleKey)}
              >
                <p className="text-sm leading-relaxed text-[color:var(--cab-text)]">{section.explanation}</p>
              </ReportSubsection>
            ))}
            {source.data.disclaimer ? (
              <p className="text-[10px] leading-snug text-[color:var(--cab-text-muted)]">{source.data.disclaimer}</p>
            ) : (
              <p className="text-[10px] leading-snug text-[color:var(--cab-text-muted)]">
                Spiegazione generativa basata sui segnali del periodo — verificare sempre i dati operativi.
              </p>
            )}
          </div>
        ) : null}
      </>
    );

    const narrativeActions = source.data ? (
      <GestionaleAiActionButton variant="secondary" size="sm" onClick={() => source.refetch()} loading={source.loading}>
        Rigenera
      </GestionaleAiActionButton>
    ) : null;

    if (embed) {
      return (
        <div className="min-w-0 space-y-4">
          {narrativeActions ? <div className="flex justify-end">{narrativeActions}</div> : null}
          {narrativeBody}
        </div>
      );
    }

    return (
      <ShellCard
        id="report-ai-analysis"
        title="Analisi AI"
        subtitle="Spiegazione narrativa dei segnali decisionali del periodo"
        className={reportZoneShellClass}
        headerActions={narrativeActions}
      >
        {narrativeBody}
      </ShellCard>
    );
  }

  const analysis = legacyAnalysis!;

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

  const body = (
    <>
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
        <div className="min-w-0 space-y-4">
          {analysis.isStale ? (
            <div className="flex min-w-0 items-center gap-3 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-warning)_30%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_6%,var(--cab-card))] px-3 py-2.5 flex-nowrap sm:flex-wrap">
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

          <ReportSubsection id="report-ai-exec-summary" title="Executive summary">
            <p className="text-sm leading-relaxed text-[color:var(--cab-text)]">
              {analysis.data.executiveSummary}
            </p>
          </ReportSubsection>

          {analysis.data.dataQualityNotes && analysis.data.dataQualityNotes.length > 0 ? (
            <ReportSubsection id="report-ai-quality" title="Qualità dati" defaultCollapsed>
              <ul className="min-w-0 space-y-1 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
                {analysis.data.dataQualityNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </ReportSubsection>
          ) : null}

          <ReportSubsection id="report-ai-kpi" title="KPI principali" defaultCollapsed>
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
          </ReportSubsection>

          {analysis.data.anomalieRilevate.length > 0 ? (
            <ReportSubsection id="report-ai-anomalie" title="Anomalie rilevate" defaultCollapsed>
              <AnalysisItemList
                items={analysis.data.anomalieRilevate.map((a, i) => ({
                  key: `anom-${i}`,
                  node: (
                    <div className={`rounded-[var(--ds-radius-lg)] border px-3 py-2.5 ${gravitaToneClass[a.gravita]}`}>
                      <div className="flex min-w-0 items-baseline justify-between gap-x-2 gap-y-0.5 flex-nowrap sm:flex-wrap">
                        <p className="text-sm font-semibold text-[color:var(--cab-text)]">{a.titolo}</p>
                        <ConfidenzaBadge confidenza={a.confidenza} />
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{a.dettaglio}</p>
                    </div>
                  ),
                }))}
              />
            </ReportSubsection>
          ) : null}

          {analysis.data.trendPositivi.length > 0 ? (
            <ReportSubsection id="report-ai-trend" title="Trend positivi" defaultCollapsed>
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
            </ReportSubsection>
          ) : null}

          {analysis.data.criticita.length > 0 ? (
            <ReportSubsection id="report-ai-criticita" title="Criticità" defaultCollapsed>
              <AnalysisItemList
                items={analysis.data.criticita.map((c, i) => ({
                  key: `crit-${i}`,
                  node: (
                    <div className={`rounded-[var(--ds-radius-lg)] border px-3 py-2.5 ${gravitaToneClass[c.gravita]}`}>
                      <div className="flex min-w-0 items-baseline justify-between gap-x-2 gap-y-0.5 flex-nowrap sm:flex-wrap">
                        <p className="text-sm font-semibold text-[color:var(--cab-text)]">{c.titolo}</p>
                        <ConfidenzaBadge confidenza={c.confidenza} />
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{c.dettaglio}</p>
                    </div>
                  ),
                }))}
              />
            </ReportSubsection>
          ) : null}

          {analysis.data.suggerimentiOperativi.length > 0 ? (
            <ReportSubsection id="report-ai-sugg" title="Suggerimenti operativi" defaultCollapsed>
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
            </ReportSubsection>
          ) : null}

          {analysis.data.prioritaImmediate.length > 0 ? (
            <ReportSubsection id="report-ai-prio" title="Priorità immediate" defaultCollapsed>
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
            </ReportSubsection>
          ) : null}

          <ReportSubsection id="report-ai-valutazione" title="Valutazione generale" defaultCollapsed>
            <p className="text-sm font-semibold text-[color:var(--cab-text)]">
              Punteggio: {analysis.data.valutazioneGenerale.punteggio}/10
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--cab-text-muted)]">
              {analysis.data.valutazioneGenerale.giudizio}
            </p>
          </ReportSubsection>

          <p className="text-[10px] leading-snug text-[color:var(--cab-text-muted)]">
            Analisi generativa basata sui KPI del periodo (Gemini) — verificare sempre i dati operativi prima di
            decisioni operative.
          </p>
        </div>
      ) : null}
    </>
  );

  if (embed) {
    return (
      <div className="min-w-0 space-y-4">
        {legacyHeaderActions ? <div className="flex min-w-0 justify-end gap-2 flex-nowrap sm:flex-wrap">{legacyHeaderActions}</div> : null}
        {body}
      </div>
    );
  }

  return (
    <ShellCard
      id="report-ai-analysis"
      title="Analisi AI"
      subtitle="Report intelligente su KPI, trend e criticità del periodo selezionato"
      className={reportZoneShellClass}
      headerActions={legacyHeaderActions}
    >
      {body}
    </ShellCard>
  );
}
