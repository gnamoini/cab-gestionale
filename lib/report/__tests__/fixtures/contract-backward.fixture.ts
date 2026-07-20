import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";

/** V1-shaped analytics blob wrappable in V2 envelope (PDF/cache/adapters). */
export type ReportV1ShapedData = {
  kpi: Record<string, number>;
  period: { start: string; end: string };
};

export const contractBackwardFixture: ReportPayload<ReportV1ShapedData> = {
  metadata: {
    contractVersion: REPORT_CONTRACT_VERSION,
    generatedAt: "2026-06-30T23:59:59.000Z",
    sourceFreshness: "CACHED",
    trustStatus: "GREEN",
    requestedPeriod: {
      preset: "custom",
      start: "2026-06-01",
      end: "2026-06-30",
      compareMode: "none",
    },
  },
  data: {
    period: { start: "2026-06-01", end: "2026-06-30" },
    kpi: {
      "lav-chiusi": 97,
      "lav-aperti": 31,
      eco_invoices: 184_520.5,
      scorta: 14,
    },
  },
};
