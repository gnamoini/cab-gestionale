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
assert.doesNotMatch(gate, /cold-start-diagnostics\.ts/);

const lazy = read("lib/observability/cold-start-diagnostics-lazy.ts");
assert.match(lazy, /isNavigationBootDiagnosticsEnabled/);
assert.doesNotMatch(lazy, /from ["']@\/lib\/observability\/cold-start-diagnostics["']/);

const diagnostics = read("lib/observability/cold-start-diagnostics.ts");
assert.match(diagnostics, /nativeLaunchGap/);
assert.match(diagnostics, /webStartup/);
assert.match(diagnostics, /applicationStartup/);
assert.match(diagnostics, /__cabColdStartReport/);
assert.match(diagnostics, /CAB_COLD_START_MEASURE\.bootMountToStaticHidden/);

const inline = read("lib/theme/app-boot-inline.ts");
assert.match(inline, /cab_static_boot_visible/);
assert.match(inline, /cab_last_visibility_hidden/);

console.log("cold-start-diagnostics-policy.test.ts OK");
