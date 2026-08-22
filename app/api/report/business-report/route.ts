import {
  handleBusinessReportGeneratePost,
  handleBusinessReportGet,
  handleBusinessReportHistoryGet,
} from "@/lib/report/business-report/api/report-business-report-api";

export const GET = handleBusinessReportGet;
export const POST = handleBusinessReportGeneratePost;
