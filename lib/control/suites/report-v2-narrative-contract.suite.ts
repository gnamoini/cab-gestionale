/** Sprint 5A — narrative contracts + AI context API gate. */
export const REPORT_V2_NARRATIVE_CONTRACT_SUITE = [
  "lib/report/narrative/__tests__/narrative-contract-schema.test.ts",
  "lib/report/narrative/__tests__/narrative-prompt-context-builder.test.ts",
  "lib/report/narrative/__tests__/narrative-prompt-context-no-enrichment.test.ts",
  "lib/report/narrative/__tests__/narrative-input-boundary.test.ts",
  "lib/report/ai-context/__tests__/ai-context-api-contract.test.ts",
  "lib/report/ai-context/__tests__/report-ai-context-rbac.test.ts",
] as const;
