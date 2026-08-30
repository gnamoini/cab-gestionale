#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/audit/lint-baseline-raw.json"), "utf8"));
const ownership = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/audit/lint-file-ownership-2026-08-29.json"), "utf8"),
);
const cleanFiles = new Set(
  ownership.files.filter((f) => f.ownership === "CLEAN").map((f) => f.file.replace(/\\/g, "/")),
);

function norm(fp) {
  return fp.replace(/\\/g, "/").replace(/^.*gestionale-cab\//, "");
}

const files = new Set();
let violations = 0;
for (const entry of baseline) {
  const file = norm(entry.filePath);
  if (!cleanFiles.has(file)) continue;
  for (const msg of entry.messages ?? []) {
    if (msg.ruleId !== "cab-layout/no-ui-contract-violation") continue;
    violations++;
    files.add(file);
  }
}
console.log("Baseline CLEAN violations:", violations);
console.log("Baseline CLEAN files with violations:", files.size);
