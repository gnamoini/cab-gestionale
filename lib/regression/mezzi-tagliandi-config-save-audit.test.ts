import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const service = read("src/services/maintenance-engine-v2.service.ts");
const drawer = read("components/gestionale/mezzi/mezzi-tagliandi-config-drawer.tsx");

assert.match(service, /resolveMezzoConfigUpsertTargetId/);
assert.match(service, /loadSingleConfigView/);
assert.match(service, /is\("preset_id", null\)/);
assert.doesNotMatch(drawer, /setSavePresetToo\(true\)/);
assert.match(drawer, /await upsertMut\.mutateAsync/);

console.log("mezzi-tagliandi-config-save-audit.test.ts OK");
