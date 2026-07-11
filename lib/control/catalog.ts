import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  SECURITY_RBAC_HARDENING_SUITE,
  SECURITY_RBAC_SUITE,
} from "@/lib/control/suites/security-rbac.suite";
import { REGRESSION_P0 } from "@/lib/control/suites/regression-p0.suite";
import { REGRESSION_P1 } from "@/lib/control/suites/regression-p1.suite";
import { REGRESSION_P2 } from "@/lib/control/suites/regression-p2.suite";
import { REGRESSION_P3 } from "@/lib/control/suites/regression-p3.suite";

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
    env: { ...process.env, ...extraEnv } as NodeJS.ProcessEnv,
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
      unknownReason: out.slice(0, 200) || result.error?.message || "spawn failed",
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
  "ux:enforce": { resolve: () => spawnNpm("ux:enforce") },
  "audit:ui": { resolve: () => spawnNpm("audit:ui") },
  "ux:mobile-gate": { resolve: () => spawnNpm("ux:mobile-gate") },
  "ios:check": { resolve: () => spawnNpm("ios:check") },
  "flex:eslint:gate": { resolve: () => spawnNpm("flex:eslint:gate") },
  "flex:freeze:gate": { resolve: () => spawnNpm("flex:freeze:gate") },
  "smoke:structural": { resolve: () => spawnNpm("smoke:structural") },
  "smoke:playwright": { resolve: () => spawnNpm("smoke:playwright") },
  "smoke:playwright:cert": { resolve: () => spawnNpm("smoke:playwright:cert") },
  "smoke:playwright:scheda-smoke": { resolve: () => spawnNpm("smoke:playwright:scheda-smoke") },
  "smoke:playwright:ricambio:cert": { resolve: () => spawnNpm("smoke:playwright:ricambio:cert") },
  "smoke:cleanup:apply": {
    resolve: () => spawnNpm("smoke:cleanup:apply", { SMOKE_CLEANUP_APPLY: "1" }),
  },
  "audit:smoke:residues": { resolve: () => spawnNpm("audit:smoke:residues") },
  "ops:long-session-soak:threshold": { resolve: () => spawnNpm("ops:long-session-soak:threshold") },
  "ops:long-session-soak": { resolve: () => spawnNpm("ops:long-session-soak") },
  lint: { resolve: () => spawnNpm("lint") },
  "ops:performance-regression-check": { resolve: () => spawnNpm("ops:performance-regression-check") },
  "verify-supabase-ci-env": {
    resolve: () => spawnScript("scripts/verify-supabase-ci-env.ts"),
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
  "formux-promotion": {
    resolve: () => ({ ok: true, blockers: [], warnings: ["formux promotion deprecated — skipped"] }),
  },
};

export function resolveCatalogReference(reference: string): CatalogEntry | undefined {
  return CONTROL_CATALOG[reference];
}
