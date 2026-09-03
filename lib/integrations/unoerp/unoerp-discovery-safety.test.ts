import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const DISCOVERY_FILES = [
  "scripts/unoerp-discovery.ts",
  "scripts/unoerp-discovery-2.ts",
  "scripts/unoerp-module-scan.ts",
  "scripts/unoerp-detail-samples.ts",
  "lib/integrations/unoerp/discovery-readonly.ts",
  "lib/integrations/unoerp/discovery-probe.ts",
  "lib/integrations/unoerp/discovery-anonymize.ts",
];

const FORBIDDEN_IN_DISCOVERY = [
  /createRecord\s*\(/,
  /updateRecord\s*\(/,
  /deleteRecord\s*\(/,
  /act\s*:\s*["']create["']/,
  /act\s*:\s*["']update["']/,
  /act\s*:\s*["']delete["']/,
  /runUnoerpSyncWorker/,
  /enqueueUnoerpSyncJob/,
];

for (const rel of DISCOVERY_FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  for (const re of FORBIDDEN_IN_DISCOVERY) {
    assert.equal(re.test(src), false, `${rel} must not match ${re}`);
  }
}

const readonlySrc = fs.readFileSync(
  path.join(ROOT, "lib/integrations/unoerp/discovery-readonly.ts"),
  "utf8",
);
assert.match(readonlySrc, /UNOERP_READONLY_ACTS/);
assert.match(readonlySrc, /info.*index.*show/);

console.log("unoerp-discovery-safety.test.ts: ok");
