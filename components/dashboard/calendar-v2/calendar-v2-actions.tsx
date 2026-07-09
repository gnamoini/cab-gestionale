"use client";

import Link from "next/link";
import { dsBtnPrimary } from "@/lib/ui/design-system";
import { erpBtnNeutral } from "@/lib/ui/erp-tokens";
import { saveReportPeriodPrefs } from "@/lib/report/report-period-persistence";
import {
  reportDeepLinkForDay,
  reportDeepLinkForWeek,
} from "@/lib/report/calendar-report-service";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import type { CalendarSelection } from "@/components/dashboard/calendar-v2/calendar-v2-types";

export function CalendarV2Actions({
  selection,
  canReport,
}: {
  selection: CalendarSelection;
  canReport: boolean;
}) {
  if (!canReport) return null;

  const deepLink =
    selection.mode === "day"
      ? reportDeepLinkForDay(selection.ymd)
      : reportDeepLinkForWeek(selection.weekStartYmd);

  function openReport() {
    saveReportPeriodPrefs({
      preset: deepLink.preset,
      compareMode: "prev_period",
      customFrom: deepLink.customFrom,
      customTo: deepLink.customTo,
      compareCustomFrom: "",
      compareCustomTo: "",
    });
  }

  const reportHref = `/report?preset=${deepLink.preset}&from=${deepLink.customFrom}&to=${deepLink.customTo}&compare=prev_period`;

  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      <Link
        href={reportHref}
        className={`${dsBtnPrimary} no-underline`}
        onClick={openReport}
      >
        {selection.mode === "day" ? "Apri Daily Report" : "Apri Weekly Report"}
      </Link>
      <button
        type="button"
        className={erpBtnNeutral}
        onClick={() => void openPdfArtifact("report-bundle")}
      >
        Export PDF
      </button>
    </div>
  );
}
