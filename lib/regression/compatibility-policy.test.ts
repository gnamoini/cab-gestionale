import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

const layout = read("app/layout.tsx");
assert.match(layout, /viewportFit:\s*"cover"/);
assert.match(layout, /width:\s*"device-width"/);

const globalsCss = read("app/globals.css");
assert.match(globalsCss, /--cab-vv-height:\s*100dvh/);
assert.match(globalsCss, /safe-area-inset/);
assert.match(globalsCss, /-webkit-overflow-scrolling:\s*touch/);

const appProvidersCore = read("components/app-providers-core.tsx");
assert.match(appProvidersCore, /IosInteractionStability/);

const iosTokens = read("lib/ui/ios-mobile-tokens.ts");
assert.match(iosTokens, /dsIosInputTextSize = "text-base md:text-sm"/);

const mobileModal = read("lib/ui/mobile-modal-behavior.ts");
assert.match(mobileModal, /CAB_MODAL_SCROLL_ATTR/);
assert.match(mobileModal, /visualViewport/);

const playwrightConfig = read("e2e/playwright.config.ts");
assert.match(playwrightConfig, /Desktop Chrome/);

const e2eMobileSpecs = [
  "e2e/smoke/04-modal-scroll.spec.ts",
  "e2e/smoke/06-mobile-shell.spec.ts",
  "e2e/smoke/12-mobile-routes.spec.ts",
] as const;
for (const spec of e2eMobileSpecs) {
  assert.ok(exists(spec), `${spec} missing`);
}

const kanbanSkeleton = read("components/design-system/loading/loading-kanban-skeleton.tsx");
assert.match(kanbanSkeleton, /overscroll-y-contain/);
assert.match(kanbanSkeleton, /\[touch-action:pan-y\]/);

assert.ok(exists("scripts/mobile-ios-regression-check.ts"));
assert.ok(exists("scripts/ux-mobile-regression-gate.ts"));

console.log("compatibility-policy.test.ts OK");
