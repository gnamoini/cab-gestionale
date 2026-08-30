import "server-only";

import { NextResponse } from "next/server";
import { fetchReportDataDTOServer } from "@/lib/bff/report-bundle-fetch-server";
import { fetchInvoiceListPayloadServer } from "@/lib/fatturazione/fatturazione-fetch-server";
import { fetchPreventiviRecordsServer } from "@/lib/preventivi/preventivi-fetch-server";
import { fetchDipendentiEntriesForRangeServer } from "@/lib/dipendenti/dipendenti-timesheet-fetch-server";
import { entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import { resolveReportV2DatasetsEnabled } from "@/lib/feature-flags/report-v2-flag";
import { buildDatasetPayload, getDatasetPolicy } from "@/lib/report/datasets/build-dataset-payload";
import type { ReportDatasetSlices } from "@/lib/report/datasets/builders/shared";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";
import { checkDatasetAccess, type ReportDatasetId } from "@/lib/report/datasets/registry";
import { buildIntegrityFromReportDto } from "@/lib/report/datasets/server/integrity-from-bundle";
import { buildReportRangeKey } from "@/lib/report/report-domain-types";
import { ymdFromDate } from "@/lib/report/date-ranges";
import {
  verifyServerPageRead,
  getServerCallerRole,
} from "@/src/lib/auth/server-permission-guards";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";

export function parseRequestedPeriod(searchParams: URLSearchParams): ReportRequestedPeriod {
  const preset = (searchParams.get("preset") ?? "questo_mese") as ReportRequestedPeriod["preset"];
  const compareMode = (searchParams.get("compareMode") ?? "none") as ReportRequestedPeriod["compareMode"];
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;
  const anchor = new Date();
  const draft: ReportRequestedPeriod = {
    preset,
    start: fromParam ?? "",
    end: toParam ?? "",
    compareMode,
  };
  const { range } = resolveDatasetDateRanges({ anchor, period: draft });
  return {
    preset,
    start: fromParam ?? ymdFromDate(range.start),
    end: toParam ?? ymdFromDate(range.end),
    compareMode,
  };
}

async function collectReadablePages(): Promise<Set<GestionalePageKey>> {
  const pages: GestionalePageKey[] = [
    "lavorazioni",
    "magazzino",
    "fatturazione",
    "dipendenti",
    "mezzi",
    "report",
  ];
  const readable = new Set<GestionalePageKey>();
  for (const page of pages) {
    if (await verifyServerPageRead(page)) readable.add(page);
  }
  return readable;
}

export async function loadBaseSlices(period: ReportRequestedPeriod): Promise<ReportDatasetSlices> {
  const dto = await fetchReportDataDTOServer();
  const integrity = buildIntegrityFromReportDto(dto);
  const { range, compareRange, compareMode } = resolveDatasetDateRanges({ period });
  return {
    integrity,
    lavRows: dto.lavorazioni,
    magazzinoRows: dto.magazzino,
    range,
    compareRange,
    compareMode,
    rangeKey: buildReportRangeKey(range, compareRange),
  };
}

function sumTimesheetHours(entries: { ore_ordinarie?: number | null; ore_straordinarie?: number | null }[]): number {
  let total = 0;
  for (const entry of entries) {
    const cell = entryToCellValue(entry as Parameters<typeof entryToCellValue>[0]);
    total += cell.oreOrdinarie + cell.oreStraordinarie;
  }
  return Math.round(total * 100) / 100;
}

export async function enrichSlicesForDataset(
  datasetId: ReportDatasetId,
  base: ReportDatasetSlices,
): Promise<ReportDatasetSlices> {
  if (datasetId === "economico") {
    const [prevRes, invRes] = await Promise.all([
      fetchPreventiviRecordsServer(),
      fetchInvoiceListPayloadServer(),
    ]);
    const invoicesAvailable = invRes.success && invRes.data != null;
    return {
      ...base,
      preventivi: prevRes.success ? (prevRes.data?.records ?? []) : [],
      invoices: invoicesAvailable ? (invRes.data?.invoices ?? []) : [],
      ddtDocuments: [],
      invoicesAvailable,
    };
  }
  if (datasetId === "ore") {
    const entriesRes = await fetchDipendentiEntriesForRangeServer(
      ymdFromDate(base.range.start),
      ymdFromDate(base.range.end),
    );
    const totalHours = entriesRes.success ? sumTimesheetHours(entriesRes.data ?? []) : 0;
    return { ...base, totalHours, schedeStore: null, costoOrario: 0 };
  }
  return base;
}

export async function handleReportDatasetGet(
  datasetId: ReportDatasetId,
  request: Request,
): Promise<NextResponse> {
  if (!resolveReportV2DatasetsEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const policy = getDatasetPolicy(datasetId);
  const readable = await collectReadablePages();
  const access = checkDatasetAccess(policy, readable);
  if (!access.ok) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const baseSlices = await loadBaseSlices(period);
  const slices = await enrichSlicesForDataset(datasetId, baseSlices);

  const includeRanking =
    datasetId === "clienti" && access.optionalGranted.includes("lavorazioni");

  const payload = buildDatasetPayload(datasetId, slices, period, { includeRanking });

  void getServerCallerRole();

  return NextResponse.json(payload);
}
