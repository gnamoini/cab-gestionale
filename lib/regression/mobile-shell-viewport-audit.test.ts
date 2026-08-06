import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const viewportFill = readFileSync(join(root, "lib/ui/viewport-fill-sync.ts"), "utf8");
const orchestrator = readFileSync(join(root, "lib/ui/gestionale-viewport-orchestrator.ts"), "utf8");
const iosStability = readFileSync(join(root, "src/components/ios-interaction-stability.tsx"), "utf8");
const shellCss = readFileSync(join(root, "app/globals-gestionale-shell.css"), "utf8");
const sidebar = readFileSync(join(root, "components/gestionale/app-shell-sidebar.tsx"), "utf8");
const diagnostics = readFileSync(join(root, "lib/observability/mobile-viewport-diagnostics.ts"), "utf8");

assert.match(viewportFill, /cabAppViewportFillClass/);
assert.match(viewportFill, /--cab-vv-height/);
assert.doesNotMatch(viewportFill, /\bfixed\b/, "Fase 1: cabAppViewportFillClass non fixed");

assert.match(orchestrator, /export function syncGestionaleViewport/);

assert.match(iosStability, /useLayoutEffect/);
assert.match(iosStability, /visibilitychange/);
assert.doesNotMatch(iosStability, /scrollTo\(0,\s*0\)/);

assert.match(shellCss, /--cab-vv-height,\s*var\(--cab-app-height/);

assert.match(sidebar, /--cab-vv-offset-top/);
assert.match(sidebar, /--cab-vv-height/);

assert.match(diagnostics, /header escaped viewport/);
assert.match(diagnostics, /NEXT_PUBLIC_MOBILE_VIEWPORT_DEBUG/);

console.log("mobile-shell-viewport-audit.test.ts OK");
