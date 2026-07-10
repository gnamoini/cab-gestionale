"use client";

import {
  ReportBarChart,
  ReportDataTable,
  ReportDensityProvider,
  ReportLineChart,
  ReportMatrix,
  ReportNarrativeBlock,
  ReportVisualization,
  StatusBadge,
} from "@/components/report/design-system";
import { MetricCard } from "@/components/report/design-system/primitives/metric-card/metric-card";
import {
  DisabledElementTooltip,
  OptionalTooltip,
  Tooltip,
  TooltipList,
  TooltipStatus,
} from "@/components/ui";
import { LIST_DIVIDER_UL, LIST_EMPTY_STATE } from "@/lib/ui/list-primitives";
import { getMetricDefinition } from "@/lib/report/metrics/get-metric-definition";
import type { ReportMetric } from "@/lib/report/metrics/report-metric-types";

const SAMPLE_METRIC: ReportMetric = {
  id: "lav-periodo",
  value: 128,
  compare: {
    status: "available",
    previousValue: 110,
    deltaAbs: 18,
    deltaPercent: 16.4,
  },
  source: { module: "preview" },
  payload: { kind: "kpi", data: { spark: [4, 6, 5, 8, 7, 9, 8] } },
};

export default function ReportDesignSystemPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="p-6 text-sm text-[color:var(--cab-text-muted)]">
        Preview design system disponibile solo in ambiente di sviluppo.
      </div>
    );
  }

  const definition = getMetricDefinition("lav-periodo");

  return (
    <ReportDensityProvider density="comfortable">
      <div className="min-w-0 space-y-8 p-4 sm:p-6">
        <header className="space-y-2">
          <h1 className="text-xl font-bold text-[color:var(--cab-text)]">Report Design System Preview</h1>
          <p className="text-sm text-[color:var(--cab-text-muted)]">Storybook interna — primitive v3.3</p>
          <StatusBadge label="Dev only" tone="info" />
        </header>

        <section className="space-y-3" data-ui-gallery="tooltip">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Tooltip (UI governance)</h2>
          <div className="flex flex-wrap gap-3">
            <Tooltip content="Azione">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm">
                Tooltip
              </button>
            </Tooltip>
            <DisabledElementTooltip content="Disabilitato" disabled>
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled>
                Disabled
              </button>
            </DisabledElementTooltip>
            <OptionalTooltip content="">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm">
                Optional vuoto
              </button>
            </OptionalTooltip>
            <TooltipList items={["Riga audit 1", "Riga audit 2"]}>
              <button type="button" className="rounded-lg border px-3 py-2 text-sm">
                TooltipList
              </button>
            </TooltipList>
            <TooltipStatus lines={[{ label: "Stato", value: "OK" }]}>
              <button type="button" className="rounded-lg border px-3 py-2 text-sm">
                TooltipStatus
              </button>
            </TooltipStatus>
          </div>
        </section>

        <section className="space-y-3" data-ui-gallery="lists">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Lists</h2>
          <ul className={`rounded-lg border ${LIST_DIVIDER_UL}`}>
            <li className="px-3 py-2 text-sm">Riga lista token SSOT</li>
            <li className="px-3 py-2 text-sm">Seconda riga</li>
          </ul>
          <div className={LIST_EMPTY_STATE}>Empty state token</div>
        </section>

        <section className="space-y-3" data-ui-gallery="overlays">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Overlays</h2>
          <p className="text-xs text-[color:var(--cab-text-muted)]">Tooltip z-140 · Dropdown z-130 · Modal shell</p>
        </section>

        <section className="space-y-3" data-ui-gallery="states">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">States</h2>
          <StatusBadge label="Loading" tone="info" />
          <StatusBadge label="Error" tone="danger" />
        </section>

        <section className="space-y-3" data-ui-gallery="accessibility">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Accessibility</h2>
          <Tooltip content="Focus visibile" showOnFocus>
            <button type="button" className="rounded-lg border px-3 py-2 text-sm focus-visible:ring-2">
              Tab focus
            </button>
          </Tooltip>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">MetricCard</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard metric={SAMPLE_METRIC} definition={definition} />
            <MetricCard metric={SAMPLE_METRIC} definition={definition} hero />
            <MetricCard metric={SAMPLE_METRIC} definition={definition} compact />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">DataTable</h2>
          <ReportDataTable
            configId="top-clienti"
            rows={[
              { rank: 1, cliente: "Cliente A", fatturato: 12000, fatture: 8 },
              { rank: 2, cliente: "Cliente B", fatturato: 9500, fatture: 5 },
            ]}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Chart</h2>
          <ReportLineChart
            title="Line sample"
            rows={[
              { label: "Gen", value: 12 },
              { label: "Feb", value: 18 },
              { label: "Mar", value: 15 },
            ]}
          />
          <ReportBarChart
            title="Bar sample"
            points={[
              { label: "Gen", value: 12 },
              { label: "Feb", value: 18 },
              { label: "Mar", value: 15 },
            ]}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Matrix</h2>
          <ReportMatrix title="Heat sample">
            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-card))] px-2 py-4"
                >
                  M{i + 1}
                </div>
              ))}
            </div>
          </ReportMatrix>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Narrative</h2>
          <ReportNarrativeBlock variant="ai" title="Sintesi IA">
            Testo narrativo di esempio per audit visivo.
          </ReportNarrativeBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Visualization shell</h2>
          <ReportVisualization title="Shell">
            <p className="text-sm text-[color:var(--cab-text-muted)]">Contenuto libero nel guscio standard.</p>
          </ReportVisualization>
        </section>
      </div>
    </ReportDensityProvider>
  );
}
