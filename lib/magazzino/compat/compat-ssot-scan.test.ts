import assert from "node:assert/strict";
import { scanCompatSsotCode } from "@/lib/magazzino/compat/compat-ssot-scan";

const scan = scanCompatSsotCode(process.cwd());

assert.ok(scan.scannedFiles > 50, "expected meaningful scan coverage");

const adapterHits = scan.hits.filter((h) => h.ruleId === "direct-magazzino-row-adapter");
assert.equal(
  adapterHits.length,
  0,
  `magazzinoRowToRicambioUI bypass: ${adapterHits.map((h) => `${h.file}:${h.line}`).join(", ")}`,
);

const resolveOutsideCompat = scan.hits.filter(
  (h) =>
    h.ruleId === "direct-resolve-compat" &&
    !h.file.includes("compat/") &&
    !h.file.includes(".test."),
);
assert.equal(
  resolveOutsideCompat.length,
  0,
  `resolveCompat outside layer: ${resolveOutsideCompat.map((h) => `${h.file}:${h.line}`).join(", ")}`,
);

console.log(`compat-ssot-scan.test.ts OK (${scan.scannedFiles} files, ${scan.hits.length} hits)`);
