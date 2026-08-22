import { spawnSync } from "node:child_process";
import path from "node:path";
import { PERFORMANCE_GOVERNANCE_SUITE } from "@/lib/control/suites/performance-governance.suite";
import {
  SECURITY_RBAC_HARDENING_SUITE,
  SECURITY_RBAC_SUITE,
} from "@/lib/control/suites/security-rbac.suite";
import { REGRESSION_P0 } from "@/lib/control/suites/regression-p0.suite";
import { REGRESSION_P1 } from "@/lib/control/suites/regression-p1.suite";
import { REGRESSION_P2 } from "@/lib/control/suites/regression-p2.suite";
import { REGRESSION_P3 } from "@/lib/control/suites/regression-p3.suite";
import { AI_RUNTIME_SUITE } from "@/lib/control/suites/ai-runtime.suite";
import { REPORT_V2_CONTRACTS_SUITE } from "@/lib/control/suites/report-v2-contracts.suite";
import { REPORT_V2_DATASETS_SUITE } from "@/lib/control/suites/report-v2-datasets.suite";
import { REPORT_V2_SEMANTIC_CONTRACT_SUITE } from "@/lib/control/suites/report-v2-semantic-contract.suite";
import { REPORT_V2_EXECUTIVE_CONTRACT_SUITE } from "@/lib/control/suites/report-v2-executive-contract.suite";
import { REPORT_V2_EXECUTIVE_BOUNDARY_SUITE } from "@/lib/control/suites/report-v2-executive-boundary.suite";
import { REPORT_V2_EXECUTIVE_SUITE } from "@/lib/control/suites/report-v2-executive.suite";
import { REPORT_V2_EXECUTIVE_HARDENING_SUITE } from "@/lib/control/suites/report-v2-executive-hardening.suite";
import { REPORT_V2_CROSS_CONTRACT_SUITE } from "@/lib/control/suites/report-v2-cross-contract.suite";
import { REPORT_V2_CROSS_PARITY_SUITE } from "@/lib/control/suites/report-v2-cross-parity.suite";
import { REPORT_V2_CROSS_ANALYSIS_SUITE } from "@/lib/control/suites/report-v2-cross-analysis.suite";
import { REPORT_V2_INSIGHT_CONTRACT_SUITE } from "@/lib/control/suites/report-v2-insight-contract.suite";
import { REPORT_V2_INSIGHT_RULES_SUITE } from "@/lib/control/suites/report-v2-insight-rules.suite";
import { REPORT_V2_INSIGHT_ENGINE_SUITE } from "@/lib/control/suites/report-v2-insight-engine.suite";
import { REPORT_V2_INSIGHT_ANALYSIS_SUITE } from "@/lib/control/suites/report-v2-insight-analysis.suite";
import { REPORT_V2_INSIGHT_HARDENING_SUITE } from "@/lib/control/suites/report-v2-insight-hardening.suite";
import { REPORT_V2_AI_CONTEXT_SUITE } from "@/lib/control/suites/report-v2-ai-context.suite";
import { REPORT_V2_NARRATIVE_CONTRACT_SUITE } from "@/lib/control/suites/report-v2-narrative-contract.suite";
import { REPORT_V2_NARRATIVE_PROVIDER_SUITE } from "@/lib/control/suites/report-v2-narrative-provider.suite";
import { REPORT_V2_NARRATIVE_QUALITY_SUITE } from "@/lib/control/suites/report-v2-narrative-quality.suite";
import { REPORT_V2_NARRATIVE_CONSUMER_SUITE } from "@/lib/control/suites/report-v2-narrative-consumer.suite";
import { REPORT_V2_NARRATIVE_PREFLIGHT_SUITE } from "@/lib/control/suites/report-v2-narrative-preflight.suite";
import { REPORT_V2_NARRATIVE_ROLLOUT_SUITE } from "@/lib/control/suites/report-v2-narrative-rollout.suite";
import { REPORT_P4_BUSINESS_REPORT_SUITE } from "@/lib/control/suites/report-p4-business-report.suite";
import { REPORT_P5_OPERATIONAL_CONTEXT_SUITE } from "@/lib/control/suites/report-p5-operational-context.suite";
import { REPORT_P6_ADVANCED_BI_SUITE } from "@/lib/control/suites/report-p6-advanced-bi.suite";
import { REPORT_P7_DECISION_CENTER_SUITE } from "@/lib/control/suites/report-p7-decision-center.suite";
import { REPORT_P8_ASK_REPORT_SUITE } from "@/lib/control/suites/report-p8-ask-report.suite";
import { REPORT_DATA_INTEGRATION_SUITE } from "@/lib/control/suites/report-data-integration.suite";
import { REPORT_DATA_COMPLETION_SUITE } from "@/lib/control/suites/report-data-completion.suite";
import { REPORT_LEGACY_CONSOLIDATION_SUITE } from "@/lib/control/suites/report-legacy-consolidation.suite";
import { REPORT_P9_LEGACY_ELIMINATION_SUITE } from "@/lib/control/suites/report-p9-legacy-elimination.suite";
import { REPORT_P10_DATA_UX_SUITE } from "@/lib/control/suites/report-p10-data-ux.suite";

export type CatalogRunResult = {
  ok: boolean;
  blockers: string[];
  warnings: string[];
  unknown?: boolean;
  unknownReason?: string;
};

export type CatalogEntry = {
  resolve: () => CatalogRunResult;
};

const ROOT = process.cwd();

function spawnNpm(script: string, extraEnv?: Record<string, string | undefined>): CatalogRunResult {
  const result = spawnSync("npm", ["run", script], {
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
    shell: true,
  });
  const out = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  if (result.status === 0) return { ok: true, blockers: [], warnings: [] };
  if (result.error?.message?.includes("ENOENT") || /environment unavailable|ECONNREFUSED|ENOTFOUND/i.test(out)) {
    return {
      ok: false,
      blockers: [],
      warnings: [],
      unknown: true,
      unknownReason: out.slice(0, 200) || result.error?.message || `npm run ${script} failed`,
    };
  }
  return { ok: false, blockers: [out.slice(-500) || `npm run ${script} failed`], warnings: [] };
}

function spawnScript(relativePath: string, args: string[] = []): CatalogRunResult {
  const full = path.join(ROOT, relativePath);
  const result = spawnSync("npx", ["tsx", full, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  const out = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  if (result.status === 0) return { ok: true, blockers: [], warnings: [] };
  if (/environment unavailable|ECONNREFUSED|ENOTFOUND|missing.*secret/i.test(out)) {
    return { ok: false, blockers: [], warnings: [], unknown: true, unknownReason: out.slice(0, 200) };
  }
  return { ok: false, blockers: [out.slice(-500) || `script ${relativePath} failed`], warnings: [] };
}

function runTestFiles(files: readonly string[]): CatalogRunResult {
  const blockers: string[] = [];
  for (const file of files) {
    const result = spawnSync("npx", ["tsx", file], { cwd: ROOT, encoding: "utf8", shell: true });
    if (result.status !== 0) {
      const tail = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim().slice(-300);
      blockers.push(`${file}: ${tail || "failed"}`);
    }
  }
  return { ok: blockers.length === 0, blockers, warnings: [] };
}

export const CONTROL_CATALOG: Record<string, CatalogEntry> = {
  "ci:tsc": { resolve: () => spawnNpm("ci:tsc") },
  "ci:build": { resolve: () => spawnNpm("ci:build") },
  "production:check": {
    resolve: () =>
      spawnNpm("production:check", {
        PRODUCTION_CHECK_REQUIRE_DB: process.env.PRODUCTION_CHECK_REQUIRE_DB ?? "1",
        CI: process.env.CI ?? "true",
      }),
  },
  "ci:supabase:publication": {
    resolve: () =>
      spawnNpm("ci:supabase:publication", {
        PUBLICATION_CHECK_STRICT: process.env.PUBLICATION_CHECK_STRICT ?? "0",
      }),
  },
  "ci:supabase:publication:full": {
    resolve: () =>
      spawnNpm("ci:supabase:publication:full", {
        PUBLICATION_CHECK_STRICT: "1",
      }),
  },
  "ci:supabase:migrations": { resolve: () => spawnNpm("ci:supabase:migrations") },
  "audit:release-v2-db": { resolve: () => spawnNpm("audit:release-v2-db") },
  "audit:write-coverage": { resolve: () => spawnNpm("audit:write-coverage") },
  "ux:enforce": { resolve: () => spawnNpm("ux:enforce") },
  "audit:ui": { resolve: () => spawnNpm("audit:ui") },
  "ux:mobile-gate": { resolve: () => spawnNpm("ux:mobile-gate") },
  "ios:check": { resolve: () => spawnNpm("ios:check") },
  "flex:eslint:gate": { resolve: () => spawnNpm("flex:eslint:gate") },
  "audit:dead-code:delta": { resolve: () => spawnNpm("audit:dead-code:delta") },
  "flex:freeze:gate": { resolve: () => spawnNpm("flex:freeze:gate") },
  "smoke:structural": { resolve: () => spawnNpm("smoke:structural") },
  "smoke:playwright": { resolve: () => spawnNpm("smoke:playwright") },
  "smoke:playwright:cert": { resolve: () => spawnNpm("smoke:playwright:cert") },
  "smoke:playwright:scheda-smoke": { resolve: () => spawnNpm("smoke:playwright:scheda-smoke") },
  "smoke:playwright:ricambio:cert": { resolve: () => spawnNpm("smoke:playwright:ricambio:cert") },
  "smoke:playwright:inventory-qr": { resolve: () => spawnNpm("smoke:playwright:inventory-qr") },
  "test:inventory-labels": { resolve: () => spawnNpm("test:inventory-labels") },
  "smoke:cleanup:apply": {
    resolve: () => spawnNpm("smoke:cleanup:apply", { SMOKE_CLEANUP_APPLY: "1" }),
  },
  "audit:smoke:residues": { resolve: () => spawnNpm("audit:smoke:residues") },
  "ops:long-session-soak:threshold": { resolve: () => spawnNpm("ops:long-session-soak:threshold") },
  "ops:long-session-soak": { resolve: () => spawnNpm("ops:long-session-soak") },
  lint: { resolve: () => spawnNpm("lint") },
  "ops:performance-regression-check": { resolve: () => spawnNpm("ops:performance-regression-check") },
  "ops:build-budget-gate": { resolve: () => spawnNpm("ops:build-budget-gate") },
  "ops:lighthouse-budget": { resolve: () => spawnNpm("ops:lighthouse-budget") },
  "ops:performance-trend-report": { resolve: () => spawnNpm("ops:performance-trend-report") },
  "performance-governance": { resolve: () => runTestFiles(PERFORMANCE_GOVERNANCE_SUITE) },
  "verify-supabase-ci-env": {
    resolve: () => spawnScript("scripts/verify-supabase-ci-env.ts"),
  },
  "verify-audit-log-pipeline": {
    resolve: () => spawnScript("scripts/verify-audit-log-pipeline.ts"),
  },
  "check-production-config": {
    resolve: () => spawnScript("scripts/check-production-config.ts", ["--skip-vercel-pull"]),
  },
  "ci-smoke-preflight-pr": {
    resolve: () => spawnScript("scripts/ci-smoke-preflight.ts", ["--tier=pr"]),
  },
  "ci-smoke-preflight-cert": {
    resolve: () => spawnScript("scripts/ci-smoke-preflight.ts", ["--tier=cert"]),
  },
  "control-certify": {
    resolve: () => spawnScript("scripts/control/certify.ts", ["--dry-run"]),
  },
  "security-rbac": { resolve: () => runTestFiles(SECURITY_RBAC_SUITE) },
  "security-rbac-hardening": { resolve: () => runTestFiles(SECURITY_RBAC_HARDENING_SUITE) },
  "regression-p0": { resolve: () => runTestFiles(REGRESSION_P0) },
  "regression-p1": { resolve: () => runTestFiles(REGRESSION_P1) },
  "regression-p2": { resolve: () => runTestFiles(REGRESSION_P2) },
  "regression-p3": { resolve: () => runTestFiles(REGRESSION_P3) },
  "control-review": { resolve: () => spawnScript("lib/control/control-review.test.ts") },
  "regression-classification": {
    resolve: () => spawnScript("lib/control/regression-classification.test.ts"),
  },
  "rbac-sync-check": { resolve: () => spawnScript("lib/control/rbac-sync-check.test.ts") },
  "control-coverage": { resolve: () => spawnScript("lib/control/control-coverage.test.ts") },
  "control-owner": { resolve: () => spawnScript("lib/control/control-owner.test.ts") },
  "registry-lifecycle": { resolve: () => spawnScript("lib/control/registry-lifecycle.test.ts") },
  "report-v2-contracts": { resolve: () => runTestFiles(REPORT_V2_CONTRACTS_SUITE) },
  "report-v2-datasets": { resolve: () => runTestFiles(REPORT_V2_DATASETS_SUITE) },
  "report-v2-semantic-contract": { resolve: () => runTestFiles(REPORT_V2_SEMANTIC_CONTRACT_SUITE) },
  "report-v2-executive-contract": { resolve: () => runTestFiles(REPORT_V2_EXECUTIVE_CONTRACT_SUITE) },
  "report-v2-executive-boundary": { resolve: () => runTestFiles(REPORT_V2_EXECUTIVE_BOUNDARY_SUITE) },
  "report-v2-executive-hardening": { resolve: () => runTestFiles(REPORT_V2_EXECUTIVE_HARDENING_SUITE) },
  "report-v2-executive": { resolve: () => runTestFiles(REPORT_V2_EXECUTIVE_SUITE) },
  "report-v2-cross-contract": { resolve: () => runTestFiles(REPORT_V2_CROSS_CONTRACT_SUITE) },
  "report-v2-cross-parity": { resolve: () => runTestFiles(REPORT_V2_CROSS_PARITY_SUITE) },
  "report-v2-cross-analysis": { resolve: () => runTestFiles(REPORT_V2_CROSS_ANALYSIS_SUITE) },
  "report-v2-insight-contract": { resolve: () => runTestFiles(REPORT_V2_INSIGHT_CONTRACT_SUITE) },
  "report-v2-insight-rules": { resolve: () => runTestFiles(REPORT_V2_INSIGHT_RULES_SUITE) },
  "report-v2-insight-engine": { resolve: () => runTestFiles(REPORT_V2_INSIGHT_ENGINE_SUITE) },
  "report-v2-insight-analysis": { resolve: () => runTestFiles(REPORT_V2_INSIGHT_ANALYSIS_SUITE) },
  "report-v2-insight-hardening": { resolve: () => runTestFiles(REPORT_V2_INSIGHT_HARDENING_SUITE) },
  "report-v2-ai-context": { resolve: () => runTestFiles(REPORT_V2_AI_CONTEXT_SUITE) },
  "report-v2-narrative-contract": { resolve: () => runTestFiles(REPORT_V2_NARRATIVE_CONTRACT_SUITE) },
  "report-v2-narrative-provider": { resolve: () => runTestFiles(REPORT_V2_NARRATIVE_PROVIDER_SUITE) },
  "report-v2-narrative-quality": { resolve: () => runTestFiles(REPORT_V2_NARRATIVE_QUALITY_SUITE) },
  "report-v2-narrative-consumer": { resolve: () => runTestFiles(REPORT_V2_NARRATIVE_CONSUMER_SUITE) },
  "report-v2-narrative-preflight": { resolve: () => runTestFiles(REPORT_V2_NARRATIVE_PREFLIGHT_SUITE) },
  "report-v2-narrative-rollout": { resolve: () => runTestFiles(REPORT_V2_NARRATIVE_ROLLOUT_SUITE) },
  "report-p4-business-report": { resolve: () => runTestFiles(REPORT_P4_BUSINESS_REPORT_SUITE) },
  "report-p5-operational-context": { resolve: () => runTestFiles(REPORT_P5_OPERATIONAL_CONTEXT_SUITE) },
  "report-p6-advanced-bi": { resolve: () => runTestFiles(REPORT_P6_ADVANCED_BI_SUITE) },
  "report-p7-decision-center": { resolve: () => runTestFiles(REPORT_P7_DECISION_CENTER_SUITE) },
  "report-p8-ask-report": { resolve: () => runTestFiles(REPORT_P8_ASK_REPORT_SUITE) },
  "report-data-integration": { resolve: () => runTestFiles(REPORT_DATA_INTEGRATION_SUITE) },
  "report-data-completion": { resolve: () => runTestFiles(REPORT_DATA_COMPLETION_SUITE) },
  "report-legacy-consolidation": { resolve: () => runTestFiles(REPORT_LEGACY_CONSOLIDATION_SUITE) },
  "report-p9-legacy-elimination": { resolve: () => runTestFiles(REPORT_P9_LEGACY_ELIMINATION_SUITE) },
  "report-p10-data-ux": { resolve: () => runTestFiles(REPORT_P10_DATA_UX_SUITE) },
  "notification-ssot": { resolve: () => spawnScript("lib/regression/notification-ssot-policy.test.ts") },
  "notification-catalog-completeness": {
    resolve: () => spawnScript("lib/regression/notification-catalog-completeness.test.ts"),
  },
  "ai-runtime": { resolve: () => runTestFiles(AI_RUNTIME_SUITE) },
  "formux-promotion": {
    resolve: () => ({ ok: true, blockers: [], warnings: ["formux promotion deprecated — skipped"] }),
  },
};

export function resolveCatalogReference(reference: string): CatalogEntry | undefined {
  return CONTROL_CATALOG[reference];
}
