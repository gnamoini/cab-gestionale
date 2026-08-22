import "server-only";

import { loadAnalyticsSourceBundle } from "@/lib/report/analytics-engine/load-source-bundle";
import { resolveAnalyticsDataRequirements } from "@/lib/report/analytics-engine/resolve-analytics-data-requirements";
import { runCalculator } from "@/lib/report/analytics-engine/calculators";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { buildReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";
import { paginateSlice } from "@/lib/report/drilldown/paginate-slice.server";
import { buildMargineComposition } from "@/lib/report/drilldown/resolvers/composition-resolver.server";
import { resolveEconomicoDrilldownRows } from "@/lib/report/drilldown/resolvers/economico-resolver.server";
import { resolveLavorazioniDrilldownRows } from "@/lib/report/drilldown/resolvers/lavorazioni-resolver.server";
import { resolveMagazzinoDrilldownRows } from "@/lib/report/drilldown/resolvers/magazzino-resolver.server";
import { resolvePreventiviDrilldownRows } from "@/lib/report/drilldown/resolvers/preventivi-resolver.server";
import { resolveDdtDrilldownRows } from "@/lib/report/drilldown/resolvers/ddt-resolver.server";
import { resolveOrdiniDrilldownRows } from "@/lib/report/drilldown/resolvers/ordini-resolver.server";
import type {
  ReportDrillDownResponse,
  ReportDrillDownRow,
} from "@/lib/report/drilldown/types";
import type { ValidatedDrilldownRequest } from "@/lib/report/drilldown/validate-drilldown-request.server";
import {
  verifyServerPageRead,
} from "@/src/lib/auth/server-permission-guards";

function formatPeriodLabel(start: string, end: string): string {
  const fmt = (ymd: string) => {
    const [y, m, d] = ymd.split("-");
    return `${d}/${m}/${y}`;
  };
  return `${fmt(start)} → ${fmt(end)}`;
}

function formatCompareLabel(
  envelope: ReturnType<typeof buildReportMetricEnvelope>,
): string | null {
  const c = envelope.metric.compare;
  if (!c || c.status !== "available") return null;
  const pct = c.deltaPercent;
  if (pct != null) {
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}% vs periodo precedente`;
  }
  if (c.deltaAbs != null) {
    return `${c.deltaAbs > 0 ? "+" : ""}${c.deltaAbs} vs periodo precedente`;
  }
  return null;
}

async function assertModuleAccess(page: ValidatedDrilldownRequest["registry"]["requiredModule"]): Promise<void> {
  if (!(await verifyServerPageRead(page))) {
    throw new DrilldownAccessError(page);
  }
}

export class DrilldownAccessError extends Error {
  readonly status = 403;
  readonly page: string;
  constructor(page: string) {
    super(`Accesso negato: ${page}`);
    this.name = "DrilldownAccessError";
    this.page = page;
  }
}

function resolveAllRows(
  request: ValidatedDrilldownRequest,
  bundle: Awaited<ReturnType<typeof loadAnalyticsSourceBundle>>,
  range: ReturnType<typeof resolveDatasetDateRanges>["range"],
): ReportDrillDownRow[] {
  const { metricId, registry, dimension, dimensionValue, filters } = request;
  const customerId = dimension === "cliente" ? dimensionValue : undefined;

  switch (registry.resolverId) {
    case "lavorazioni":
      return resolveLavorazioniDrilldownRows(metricId, bundle, range);
    case "economico":
      return resolveEconomicoDrilldownRows(metricId, bundle, range, customerId);
    case "magazzino":
      return resolveMagazzinoDrilldownRows(metricId, bundle, range, filters);
    case "preventivi":
      return resolvePreventiviDrilldownRows(metricId, bundle, range, filters);
    case "ddt":
      return resolveDdtDrilldownRows(metricId, bundle, range, filters);
    case "ordini":
      return resolveOrdiniDrilldownRows(metricId, bundle, range, filters);
    default:
      return [];
  }
}

export async function runDrilldownServer(
  request: ValidatedDrilldownRequest,
): Promise<ReportDrillDownResponse> {
  if (!(await verifyServerPageRead("report"))) {
    throw new DrilldownAccessError("report");
  }
  await assertModuleAccess(request.registry.requiredModule);

  const requirements = resolveAnalyticsDataRequirements([request.metricId]);
  const bundle = await loadAnalyticsSourceBundle(request.period, requirements);
  const { range } = resolveDatasetDateRanges({ period: request.period });

  const manifest = getEngineManifestEntry(request.metricId);
  const registryEntry = getRegistryEntry(request.metricId);
  if (!manifest || !registryEntry) {
    throw new Error("Metric configuration missing");
  }

  const scalar = runCalculator(manifest.calculatorId, { bundle, range });
  const metric = {
    id: request.metricId,
    value: scalar.availability === "not_available" ? 0 : scalar.value,
    compare: null,
    source: { module: "analytics-engine", trace: manifest.calculatorId },
  };
  const envelope = buildReportMetricEnvelope(
    metric,
    registryEntry,
    range,
    request.compareMode ?? request.period.compareMode,
  );
  const formatter = registryEntry.formatter ?? registryEntry.unit;
  const metricValueLabel =
    scalar.availability === "not_available"
      ? null
      : formatReportMetricValue(envelope.metric.value, formatter);

  const headerBase = {
    periodLabel: formatPeriodLabel(request.period.start, request.period.end),
    metricValueLabel,
    compareLabel: formatCompareLabel(envelope),
    trust: envelope.trust,
    aggregationKind: request.registry.aggregationKind,
    drillDownKind: request.registry.drillDownKind,
    parityApplicable: request.registry.parityApplicable,
    parityNote: request.registry.parityApplicable
      ? undefined
      : "Il numero di record può differire dal valore aggregato della metrica.",
  };

  if (request.registry.drillDownKind === "composition_analysis") {
    return {
      drillDownKind: "composition_analysis",
      header: {
        ...headerBase,
        title: "Analisi della composizione del margine stimato",
        recordCount: null,
      },
      composition: buildMargineComposition(bundle, range),
    };
  }

  const allRows = resolveAllRows(request, bundle, range);
  const page = paginateSlice(allRows, request.cursor, request.pageSize);

  let title = registryEntry.label;
  if (request.dimension === "cliente" && request.dimensionValue) {
    const labelRow = allRows.find((r) => r.sublabel);
    title = labelRow?.sublabel?.split(" · ")[0] ?? registryEntry.label;
  }

  return {
    drillDownKind: "record_list",
    header: {
      ...headerBase,
      title,
      recordCount: page.pageInfo.totalEstimate,
    },
    page,
  };
}
