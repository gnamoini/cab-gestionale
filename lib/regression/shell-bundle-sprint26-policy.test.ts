/**
 * Sprint 2.6 shell bundle policy — ranking v3.1, displacement anti-placebo, KB tier.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { auditShellBootInvestigationImports } from "@/lib/regression/shell-static-import-audit";
import { DUPLICATE_ACTION_THRESHOLD_KB } from "@/lib/performance/bundle-ranking-types";

const ROOT = process.cwd();
const RANKING = path.join(ROOT, "test-results", "bundle-dependency-ranking-sprint26.json");
const RANKING_BASELINE = path.join(ROOT, "test-results", "bundle-dependency-ranking-sprint26-baseline.json");
const ANALYSIS = path.join(ROOT, "test-results", "shared-chunk-analysis-sprint26.json");
const DISPLACEMENT = path.join(ROOT, "test-results", "chunk-displacement-sprint26.json");
const SNAPSHOT = path.join(ROOT, "test-results", "build-budget-snapshot.json");
const CRITICAL_BASELINE = path.join(ROOT, "test-results", "critical-provider-baseline-sprint26.json");
const PROVIDER_AUDIT = path.join(ROOT, "docs", "performance", "sprint26-provider-audit.md");
const DEFER_FLAGS = path.join(ROOT, "lib", "performance", "defer-flags.ts");

const SPRINT26_PASS_KB = 1700;
const SPRINT26_WARN_KB = 1750;

function readJson(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

// Sprint 2.5 AST inheritance
const astViolations = auditShellBootInvestigationImports();
assert.equal(astViolations.length, 0, `AST violations:\n${astViolations.join("\n")}`);

// defer-flags SSOT
const deferSrc = fs.readFileSync(DEFER_FLAGS, "utf8");
assert.match(deferSrc, /NEXT_PUBLIC_UPLOAD_TRAY_DEFER/);
assert.match(deferSrc, /NEXT_PUBLIC_SUPABASE_BANNER_DEFER/);
assert.match(deferSrc, /__GESTIONALE_FEATURE_FLAGS__/);

// Deferred components in app-providers
const providers = fs.readFileSync(path.join(ROOT, "components/app-providers-gestionale.tsx"), "utf8");
assert.match(providers, /DeferredUploadFeedbackShell/);
assert.match(providers, /DeferredSupabaseConfigurationBanner/);
assert.doesNotMatch(providers, /DeferredDataStaleBanner/);
assert.doesNotMatch(providers, /from ["']@\/components\/gestionale\/upload["']/);

const gestionaleLayout = fs.readFileSync(path.join(ROOT, "app/(gestionale)/layout.tsx"), "utf8");
assert.match(gestionaleLayout, /DeferredFormUxBoundaryBootstrap/);
assert.doesNotMatch(gestionaleLayout, /import \{ FormUxBoundaryBootstrap \}/);

// Provider audit doc
assert.ok(fs.existsSync(PROVIDER_AUDIT), "missing sprint26-provider-audit.md");

// Ranking v3.1 schema
if (fs.existsSync(RANKING)) {
  const ranking = readJson("test-results/bundle-dependency-ranking-sprint26.json") as {
    schemaVersion?: string;
    topImpact?: { globalReach?: object; firstLoadFactor?: number; reachScope?: string }[];
  };
  assert.equal(ranking.schemaVersion, "3.1");
  const top = ranking.topImpact?.[0];
  assert.ok(top?.globalReach && "publicRoutes" in (top.globalReach as object));
  assert.ok(typeof top?.firstLoadFactor === "number");
  assert.ok(top?.reachScope);
} else {
  console.warn("shell-bundle-sprint26-policy: no ranking sprint26 — run bench:bundle-ranking:sprint26");
}

if (fs.existsSync(ANALYSIS)) {
  const analysis = readJson("test-results/shared-chunk-analysis-sprint26.json") as {
    duplicateActionThresholdKb?: number;
    deferCandidates?: { decision: string }[];
  };
  assert.equal(analysis.duplicateActionThresholdKb, DUPLICATE_ACTION_THRESHOLD_KB);
  assert.ok(analysis.deferCandidates?.some((c) => c.decision === "freeze"));
}

if (fs.existsSync(DISPLACEMENT)) {
  const disp = readJson("test-results/chunk-displacement-sprint26.json") as {
    pass?: boolean;
    deferTargets?: { antiPlaceboPass?: boolean }[];
  };
  assert.equal(disp.pass, true, "chunk displacement must PASS");
  for (const t of disp.deferTargets ?? []) {
    assert.equal(t.antiPlaceboPass, true, `anti-placebo fail for defer target`);
  }
}

if (fs.existsSync(CRITICAL_BASELINE)) {
  const crit = readJson("test-results/critical-provider-baseline-sprint26.json") as {
    criticalProviderCountDefinition?: string;
    criticalProviderCount?: number;
  };
  assert.match(crit.criticalProviderCountDefinition ?? "", /page-ready-toolbar/);
  assert.ok((crit.criticalProviderCount ?? 0) >= 0);
}

if (fs.existsSync(SNAPSHOT)) {
  const snap = readJson("test-results/build-budget-snapshot.json") as { firstLoadJsKb?: number };
  const kb = snap.firstLoadJsKb ?? 9999;
  if (kb > SPRINT26_WARN_KB) {
    throw new Error(`Sprint 2.6 FAIL: firstLoadJsKb=${kb} > ${SPRINT26_WARN_KB}`);
  }
  if (kb > SPRINT26_PASS_KB) {
    console.warn(`Sprint 2.6 WARN: firstLoadJsKb=${kb} > ${SPRINT26_PASS_KB}`);
  } else {
    console.log(`Sprint 2.6 PASS: firstLoadJsKb=${kb} ≤ ${SPRINT26_PASS_KB}`);
  }
}

if (!fs.existsSync(RANKING_BASELINE)) {
  console.warn("shell-bundle-sprint26-policy: missing ranking baseline — copy after first ranking run");
}

console.log("shell-bundle-sprint26-policy.test.ts OK");
