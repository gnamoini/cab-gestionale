import "server-only";

import { resolveBusinessReportEnabled } from "@/lib/feature-flags/report-v2-flag";
import {
  buildBusinessReportRequestedPeriod,
  resolveClosedPeriodRange,
} from "@/lib/report/business-report/period/resolve-business-report-period";
import { generateBusinessReport } from "@/lib/report/business-report/pipeline/generate-business-report";
import type { BusinessReportType } from "@/lib/report/business-report/types";

export type ScheduledBusinessReportResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  reportType?: BusinessReportType;
  runId?: string;
};

export async function runScheduledBusinessReportServer(
  reportType: BusinessReportType,
): Promise<ScheduledBusinessReportResult> {
  if (!resolveBusinessReportEnabled()) {
    return { ok: true, skipped: true, reason: "feature_disabled", reportType };
  }

  const range = resolveClosedPeriodRange(reportType);
  const period = buildBusinessReportRequestedPeriod(reportType, range);

  const result = await generateBusinessReport({
    reportType,
    period,
    useServiceRole: true,
  });

  if (!result.ok) {
    if (result.code === "already_running") {
      return { ok: true, skipped: true, reason: "already_running", reportType };
    }
    return { ok: false, skipped: false, reason: result.message, reportType };
  }

  if (result.cached) {
    return { ok: true, skipped: true, reason: "already_recorded", reportType, runId: result.runId };
  }

  return { ok: true, skipped: false, reportType, runId: result.runId };
}
