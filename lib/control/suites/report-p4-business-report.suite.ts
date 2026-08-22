/** P4 Business Report Engine — control suite gate */
export const REPORT_P4_BUSINESS_REPORT_SUITE = [
  "lib/report/business-report/__tests__/report-run-keys.test.ts",
  "lib/report/business-report/__tests__/resolve-generate-attempt.test.ts",
  "lib/report/business-report/__tests__/storage-idempotency.test.ts",
  "lib/report/business-report/__tests__/failure-retry-lifecycle.test.ts",
  "lib/report/business-report/__tests__/feature-flag-business-report.test.ts",
  "lib/report/business-report/__tests__/scheduled-business-report.test.ts",
  "lib/report/business-report/__tests__/metric-selection.test.ts",
  "lib/report/business-report/__tests__/deterministic-buckets.test.ts",
  "lib/report/business-report/__tests__/claim-validation.test.ts",
  "lib/report/business-report/__tests__/validate-business-report-trust.test.ts",
  "lib/report/business-report/__tests__/ai-fallback.test.ts",
  "lib/report/business-report/__tests__/report-rls-exec-fix.test.ts",
  "lib/report/drilldown/__tests__/drilldown-contract.test.ts",
  "lib/regression/report-p2-ui-no-formulas.test.ts",
] as const;
