import "server-only";

import { NextResponse } from "next/server";
import { buildAnalisiOreOfficinaPayload } from "@/lib/analytics/hours/build-analisi-ore-officina-payload";
import {
  fetchDipendentiEntriesForRangeServer,
  fetchDipendentiEmployeesServer,
} from "@/lib/dipendenti/dipendenti-timesheet-fetch-server";
import { fetchPreventiviRecordsServer } from "@/lib/preventivi/preventivi-fetch-server";
import { parseRequestedPeriod } from "@/lib/report/datasets/api/report-dataset-api";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";
import { fetchReportDataDTOServer } from "@/lib/bff/report-bundle-fetch-server";
import { resolveReportV2DomainDtoEnabled } from "@/lib/feature-flags/report-v2-flag";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { ymdFromDate } from "@/lib/report/date-ranges";
import type { AddettiEmployeeMappingRow } from "@/src/types/supabase-tables";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!resolveReportV2DomainDtoEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const canDip = await verifyServerPageRead("dipendenti");
  const canLav = await verifyServerPageRead("lavorazioni");
  if (!canDip && !canLav) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const { range } = resolveDatasetDateRanges({ anchor: new Date(), period });
  const dto = await fetchReportDataDTOServer();

  const [employeesRes, entriesRes, preventiviRes, mappingsRes] = await Promise.all([
    fetchDipendentiEmployeesServer(),
    fetchDipendentiEntriesForRangeServer(ymdFromDate(range.start), ymdFromDate(range.end)),
    fetchPreventiviRecordsServer(),
    createSupabaseServerUserClient().then((c) =>
      c
        .from("addetti_employee_mapping")
        .select("id, addetto_nome, employee_id, confirmed_at, confirmed_by, created_at, updated_at"),
    ),
  ]);

  const payload = buildAnalisiOreOfficinaPayload({
    range,
    completate: [],
    lavListRows: dto.lavorazioni,
    schedeStore: null,
    schedeInterventiRows: [],
    timesheetEntries: entriesRes.success ? entriesRes.data ?? [] : [],
    timesheetEmployees: employeesRes.success ? employeesRes.data ?? [] : [],
    mappings: (mappingsRes.data ?? []) as AddettiEmployeeMappingRow[],
    preventivi: preventiviRes.success ? preventiviRes.data?.records ?? [] : [],
  });

  return NextResponse.json({ data: payload });
}
