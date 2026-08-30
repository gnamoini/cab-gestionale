/**
 * UI OS Phase 2 — activation + adapter policy tests.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildPhase2CompareReport } from "@/lib/ui-os/ui-phase2-compare";
import { evaluateRenderDecision, UI_OS_FALLBACK_LOG_PREFIX, UI_OS_PHASE2_LOG_PREFIX } from "@/lib/ui-os/ui-render-decision";
import { UI_OS_OPT_IN_PAGES } from "@/lib/ui-os/ui-os-engine";
import { suggestSchemaHints } from "@/lib/ui-os/ui-migration-layer";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";

const ROOT = process.cwd();

assert.equal(UI_OS_OPT_IN_PAGES["/report"], "os");
assert.equal(UI_OS_OPT_IN_PAGES["/magazzino"], "os");
assert.equal(UI_OS_OPT_IN_PAGES["/lavorazioni"], "os");

const adapterSrc = fs.readFileSync(path.join(ROOT, "lib/ui-os/ui-backward-adapter.tsx"), "utf8");
assert.match(adapterSrc, /page\?: string/);
assert.match(adapterSrc, /UiOsErrorBoundary/);
assert.match(adapterSrc, /useUIOsPhase2/);

const rendererSrc = fs.readFileSync(path.join(ROOT, "lib/ui-os/ui-renderer.tsx"), "utf8");
assert.match(rendererSrc, /data-ui-os-primary/);
assert.match(rendererSrc, /className="contents"/);

for (const page of ["report/page.tsx", "lavorazioni/page.tsx", "magazzino/page.tsx"]) {
  const src = fs.readFileSync(path.join(ROOT, "app/(gestionale)", page), "utf8");
  assert.match(src, /UIPageAdapter/);
  assert.match(src, /mode="os"/);
}

const schema = getSuggestedSchema("/report");
const hints = suggestSchemaHints(schema, schema);
assert.equal(hints.length, 0);

const prevEnv = process.env.NEXT_PUBLIC_CAB_UI_OS;
process.env.NEXT_PUBLIC_CAB_UI_OS = "1";
const decision = evaluateRenderDecision({ pageId: "/report", schema, mode: "os", root: null });
const compare = buildPhase2CompareReport("/report", schema, decision, null);
assert.equal(compare.page, "/report");
assert.ok(["OK", "FALLBACK"].includes(compare.legacyRender));
assert.ok(["OK", "BLOCKED"].includes(compare.osRender));
assert.equal(UI_OS_PHASE2_LOG_PREFIX, "[ui-os-phase-2]");
assert.equal(UI_OS_FALLBACK_LOG_PREFIX, "[ui-os-fallback]");
process.env.NEXT_PUBLIC_CAB_UI_OS = prevEnv;

console.log("ui-os-phase2.test.ts OK");
