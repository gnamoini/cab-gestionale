import "server-only";

import { NextResponse } from "next/server";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
import { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
import {
  buildEconomicoDataset,
  economicoDatasetWarnings,
} from "@/lib/report/datasets/builders/economico";
import {
  enrichSlicesForDataset,
  loadBaseSlices,
  parseRequestedPeriod,
} from "@/lib/report/datasets/api/report-dataset-api";
import { buildReportMetadataEnvelope } from "@/lib/report/datasets/metadata/build-report-metadata-envelope";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import { buildReportExecutiveDto } from "@/lib/report/executive/build-report-executive-dto";
import { EXECUTIVE_CONTRACT_VERSION, type ExecutivePayloadData } from "@/lib/report/executive/types";
import { resolveReportV2ExecutiveEnabled } from "@/lib/feature-flags/report-v2-flag";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";

export async function handleReportExecutiveGet(request: Request): Promise<NextResponse> {
  if (!resolveReportV2ExecutiveEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const t0 = Date.now();
  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const baseSlices = await loadBaseSlices(period);
  const economicoSlices = await enrichSlicesForDataset("economico", baseSlices);

  const lavCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
    integrity: baseSlices.integrity,
  });
  const magCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
    integrity: baseSlices.integrity,
  });
  const ecoCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
    integrity: economicoSlices.integrity,
  });

  const lavorazioniResult = buildLavorazioniDataset(lavCtx, baseSlices);
  const magazzinoResult = buildMagazzinoDataset(magCtx, baseSlices);
  const economicoResult = buildEconomicoDataset(ecoCtx, economicoSlices);
  const economicoWarnings = economicoDatasetWarnings(economicoResult.data);

  const childMetadata = [
    buildReportMetadataEnvelope(lavCtx),
    buildReportMetadataEnvelope(magCtx),
    buildReportMetadataEnvelope(ecoCtx, economicoWarnings),
  ];

  const executive = buildReportExecutiveDto({
    lavorazioni: lavorazioniResult.data,
    magazzino: magazzinoResult.data,
    economico: economicoResult.data,
    childMetadata,
    requestedPeriod: period,
  });

  const payload: ReportPayload<ExecutivePayloadData> = {
    metadata: executive.metadata,
    data: {
      contractVersion: EXECUTIVE_CONTRACT_VERSION,
      cards: executive.cards,
    },
  };
  assertValidReportPayload(payload);

  reportMetricObserver.emit("executive_payload_generated", {
    consumer: "executive",
    metricId: "executive",
    executionTimeMs: Date.now() - t0,
    cardCount: executive.cards.length,
  });

  return NextResponse.json(payload);
}
