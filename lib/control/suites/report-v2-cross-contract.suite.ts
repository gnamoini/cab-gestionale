/** Sprint 3 — cross DTO contract gate (structure + derived integrity). */
export const REPORT_V2_CROSS_CONTRACT_SUITE = [
  "lib/report/contracts/__tests__/merge-trust-status.test.ts",
  "lib/report/cross-analysis/__tests__/cross-contract-schema.test.ts",
  "lib/report/cross-analysis/__tests__/cross-metric-registry-integrity.test.ts",
  "lib/report/metrics/__tests__/derived-metric-catalog.test.ts",
  "lib/report/cross-analysis/__tests__/cross-contract-snapshot.test.ts",
] as const;
