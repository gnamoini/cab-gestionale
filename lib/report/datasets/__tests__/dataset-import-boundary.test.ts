import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const datasetsDir = path.join(ROOT, "lib/report/datasets");

function readTsFiles(dir: string): string {
  if (!fs.existsSync(dir)) return "";
  const parts: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "__tests__" && entry.name !== "server") {
      parts.push(readTsFiles(abs));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      entry.name !== "test-helpers.ts"
    ) {
      parts.push(fs.readFileSync(abs, "utf8"));
    }
  }
  return parts.join("\n");
}

const src = readTsFiles(datasetsDir);

for (const re of [
  /from\s+["']@\/components\//,
  /from\s+["']@\/src\/hooks\//,
  /from\s+["']@tanstack\/react-query/,
  /from\s+["']react-query/,
]) {
  assert.doesNotMatch(src, re, `datasets must not import forbidden layer ${re}`);
}

console.log("dataset-import-boundary.test.ts OK");
