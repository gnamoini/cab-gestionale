/**
 * Global Flex System — definitive stack invariants (non-breaking policy).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  FLEX_ENFORCEMENT_LAYERS,
  FLEX_SAFE_MODES,
  FlexSystemCharter,
  UI_OS_FLEX_INTEGRATION,
} from "@/lib/ui/flex-system-policy";
import { FLEX_SYSTEM_ABSOLUTE_FINAL_STATE } from "@/lib/ui/flex-system-freeze";
import { FLEX_SCOPE_CLASS, flexSafeCol, flexSafeRow } from "@/lib/ui/global-flex-system";
import { FLEX_AUDIT_HYDRATION_DELAY_MS } from "@/lib/ui/responsive-layout-audit";

const ROOT = process.cwd();

assert.equal(FLEX_SYSTEM_ABSOLUTE_FINAL_STATE, true);

assert.equal(FLEX_SAFE_MODES.row.token, flexSafeRow);
assert.equal(FLEX_SAFE_MODES.col.token, flexSafeCol);
assert.equal(FLEX_ENFORCEMENT_LAYERS.cssScope, FLEX_SCOPE_CLASS);
assert.equal(FLEX_ENFORCEMENT_LAYERS.eslintRule, "cab-layout/no-flex-overflow-risk");
assert.equal(UI_OS_FLEX_INTEGRATION.flexBlocksOsRender, true);
assert.equal(UI_OS_FLEX_INTEGRATION.validationOrder[2], "flex");
assert.ok(FLEX_AUDIT_HYDRATION_DELAY_MS >= 300);

const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, ".eslint-flex-baseline.json"), "utf8"));
assert.ok(baseline.checksum, "baseline must include checksum");
assert.equal(baseline.entryCount, baseline.entries.length);

assert.ok(fs.existsSync(path.join(ROOT, "lib/ui/flex-freeze-manifest.json")));
assert.ok(fs.existsSync(path.join(ROOT, "eslint-rules/no-flex-overflow-risk.mjs")));

const globalsCss = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
assert.match(globalsCss, new RegExp(`\\.${FLEX_SCOPE_CLASS} \\.flex > \\*`));
assert.match(globalsCss, /\.flex-safe-row\s*\{/);
assert.match(globalsCss, /\.flex-safe-col\s*\{/);
assert.match(globalsCss, /\.flex-safe-item\s*\{/);
assert.match(globalsCss, /\.text-safe\s*\{/);
assert.doesNotMatch(globalsCss, /gestionale-responsive-core[\s\S]*flex-wrap:\s*wrap/);

const eslintConfig = fs.readFileSync(path.join(ROOT, "eslint.config.mjs"), "utf8");
assert.match(eslintConfig, /no-flex-overflow-risk":\s*"error"/);

const auditMount = fs.readFileSync(
  path.join(ROOT, "components/gestionale/responsive-layout-audit-mount.tsx"),
  "utf8",
);
assert.match(auditMount, /runFlexSystemAudit/);
assert.match(auditMount, /FLEX_AUDIT_HYDRATION_DELAY_MS|HYDRATION_SETTLE_MS/);

const uiOsDecision = fs.readFileSync(path.join(ROOT, "lib/ui-os/ui-render-decision.ts"), "utf8");
assert.match(uiOsDecision, /flex_unsafe/);
assert.match(uiOsDecision, /validateFlexSystemPolicy/);
assert.match(uiOsDecision, /Flex gate precede drift/);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
assert.ok(pkg.scripts["flex:baseline:generate"]);
assert.ok(pkg.scripts["flex:baseline:diff"]);
assert.ok(pkg.scripts["flex:eslint:gate"]);
assert.ok(pkg.scripts["flex:freeze:gate"]);

assert.ok(FlexSystemCharter.baseRules.length >= 3);
assert.ok(FlexSystemCharter.modalRules.length >= 2);

console.log("flex-system-definitive.test.ts OK");
