import { handleReportDatasetGet } from "@/lib/report/datasets/api/report-dataset-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleReportDatasetGet("ore", request);
}
