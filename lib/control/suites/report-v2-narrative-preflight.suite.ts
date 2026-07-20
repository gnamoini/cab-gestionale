/** Sprint 5E — narrative production pre-flight (before rollout flip). */
export const REPORT_V2_NARRATIVE_PREFLIGHT_SUITE = [
  "lib/feature-flags/report-v2-flag.test.ts",
  "lib/feature-flags/report-v2-rollout-config.test.ts",
  "lib/report/narrative/__tests__/narrative-tenant-resolver.test.ts",
  "lib/report/narrative/__tests__/narrative-provider-policy.test.ts",
  "lib/report/narrative/__tests__/gemini-adapter-contract.test.ts",
  "lib/report/narrative/__tests__/narrative-rate-limit.test.ts",
  "lib/report/narrative/__tests__/narrative-telemetry-pipeline.test.ts",
  "lib/report/narrative/__tests__/report-v2-kill-switch.integration.test.ts",
] as const;
