import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const gate = read("lib/observability/navigation-boot-gate.ts");
assert.match(gate, /NEXT_PUBLIC_BOOT_INVESTIGATION/);
assert.match(gate, /__cabForceNavDiagnostics/);
assert.doesNotMatch(gate, /navigation-boot-timeline/);

const timeline = read("lib/observability/navigation-boot-timeline.ts");
assert.match(timeline, /isNavigationBootDiagnosticsEnabled/);

const waterfall = read("lib/observability/navigation-http-waterfall.ts");
assert.match(waterfall, /duplicateCount/);

console.log("navigation-boot-timeline-policy.test.ts OK");
