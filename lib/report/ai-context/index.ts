export {
  AI_CONTEXT_CONTRACT_VERSION,
  AI_CONTEXT_MAX_INSIGHTS,
  AI_CONTEXT_MAX_PAYLOAD_BYTES,
  AI_INSIGHT_PAYLOAD_SCHEMA_VERSION,
} from "@/lib/report/ai-context/types";
export type {
  AIContextContractVersion,
  AIInsightPayload,
  AIInsightSignal,
  ReportAIContextDto,
  ReportAIContextPayloadData,
} from "@/lib/report/ai-context/types";
export { buildReportAIContextDto, type BuildReportAIContextInput } from "@/lib/report/ai-context/build-report-ai-context";
