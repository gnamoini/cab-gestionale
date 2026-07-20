/** Sprint 5D — narrative HTTP + UI consumer gate. */
export const REPORT_V2_NARRATIVE_CONSUMER_SUITE = [
  "lib/report/ai-context/__tests__/report-ai-context-before-after-equivalence.test.ts",
  "lib/report/ai-context/__tests__/report-ai-context-shared-builder.test.ts",
  "lib/report/narrative/__tests__/narrative-api-contract.test.ts",
  "lib/report/narrative/__tests__/narrative-api-rbac.test.ts",
  "lib/report/narrative/__tests__/narrative-api-error-mapping.test.ts",
  "lib/report/narrative/__tests__/narrative-runtime-boundary.test.ts",
  "lib/report/narrative/__tests__/narrative-consumer-boundary.test.ts",
  "lib/report/narrative/__tests__/narrative-ui-boundary.test.ts",
  "lib/report/narrative/__tests__/narrative-tenant-resolver.test.ts",
] as const;
