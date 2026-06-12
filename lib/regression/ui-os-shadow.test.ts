/**
 * UI OS Shadow — integration policy tests.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildShadowReport } from "@/lib/ui-os/ui-os-engine";
import { UI_OS_SHADOW_LOG_PREFIX } from "@/lib/ui-os/ui-schema";
import { isPageAllowlisted } from "@/lib/ui-os/ui-migration-layer";

const ROOT = process.cwd();

const ssr = buildShadowReport("/lavorazioni", null);
assert.equal(ssr.layoutScore, 100);
assert.equal(ssr.contractViolations, 0);
assert.ok(ssr.detectedSchema);

assert.equal(isPageAllowlisted("/lavorazioni:kanban"), true);

const coreFiles = [
  "lib/ui-os/ui-schema.ts",
  "lib/ui-os/ui-contracts.ts",
  "lib/ui-os/ui-resolver.ts",
  "lib/ui-os/ui-renderer.tsx",
  "lib/ui-os/ui-os-engine.ts",
  "lib/ui-os/ui-migration-layer.ts",
  "lib/ui-os/ui-backward-adapter.tsx",
  "lib/ui-os/use-ui-os-shadow.ts",
  "components/gestionale/ui-os-shadow-mount.tsx",
];

for (const f of coreFiles) {
  assert.ok(fs.existsSync(path.join(ROOT, f)), `missing ${f}`);
}

const engine = fs.readFileSync(path.join(ROOT, "lib/ui-os/ui-os-engine.ts"), "utf8");
assert.match(engine, /UI_OS_OPT_IN_PAGES/);
assert.match(engine, /"\/report": "os"/);
assert.match(engine, /buildShadowReport/);

const appShell = fs.readFileSync(path.join(ROOT, "components/gestionale/app-shell.tsx"), "utf8");
assert.match(appShell, /DevAuditMounts/);
assert.match(
  fs.readFileSync(path.join(ROOT, "components/gestionale/dev-audit-mounts.tsx"), "utf8"),
  /UiOsShadowMount/,
);

assert.equal(UI_OS_SHADOW_LOG_PREFIX, "[ui-os-shadow]");

console.log("ui-os-shadow.test.ts OK");
