#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");

function normalizeFile(fp) {
  return fp.replace(/\\/g, "/").replace(/^.*gestionale-cab\//, "");
}

let eslintOut = "";
try {
  eslintOut = execSync(
    'npx eslint "components/**/*.{tsx,ts}" "app/**/*.{tsx,ts}" --format json --no-error-on-unmatched-pattern',
    { cwd: ROOT, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
  );
} catch (e) {
  eslintOut = e.stdout?.toString() ?? "";
}

const results = JSON.parse(eslintOut);
const ownership = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/audit/lint-file-ownership-2026-08-29.json"), "utf8"),
);
const cleanFiles = new Set(
  ownership.files.filter((f) => f.ownership === "CLEAN").map((f) => f.file.replace(/\\/g, "/")),
);

const violations = [];
for (const entry of results) {
  const file = normalizeFile(entry.filePath);
  if (!cleanFiles.has(file)) continue;
  for (const msg of entry.messages ?? []) {
    if (msg.ruleId !== "cab-layout/no-ui-contract-violation") continue;
    violations.push({ file, line: msg.line, message: msg.message });
  }
}

const byFile = {};
for (const v of violations) byFile[v.file] = (byFile[v.file] || 0) + 1;

console.log("CLEAN no-ui-contract-violation remaining:", violations.length);
console.log("CLEAN files with violations:", Object.keys(byFile).length);
if (violations.length > 0) {
  console.log("Samples:", JSON.stringify(violations.slice(0, 15), null, 2));
}
