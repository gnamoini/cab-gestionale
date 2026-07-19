import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = readFileSync(join(root, "lib/ui/gestionale-viewport-orchestrator.ts"), "utf8");

assert.match(src, /subscribeGestionaleViewport/);
assert.match(src, /waitForViewportStable/);
assert.match(src, /DEFAULT_STABLE_FRAMES = 2/);
assert.match(src, /STABLE_MAX_FRAMES = 12/);
assert.match(src, /syncFocusVisibilityCssVars/);
assert.match(src, /syncAppViewportFill/);
assert.doesNotMatch(src, /setTimeout/);
assert.doesNotMatch(src, /setInterval/);

console.log("gestionale-viewport-orchestrator.test.ts OK");
