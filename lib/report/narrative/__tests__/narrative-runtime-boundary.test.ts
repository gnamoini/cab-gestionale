import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const FORBIDDEN_API = [
  /from\s+["'].*\/providers\//,
  /from\s+["'].*\/quality\//,
  /from\s+["'].*gemini/i,
  /from\s+["'].*aiService/,
];
const FORBIDDEN_COMPONENTS = [
  /from\s+["'].*\/providers\//,
  /from\s+["'].*\/quality\//,
  /from\s+["'].*gemini/i,
  /from\s+["'].*aiService/,
  /from\s+["'].*narrative-service/,
];

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "__tests__") {
      out.push(...collectTsFiles(abs));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      out.push(abs);
    }
  }
  return out;
}

const apiDir = path.join(process.cwd(), "app/api/report/narrative");
for (const file of collectTsFiles(apiDir)) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  for (const re of FORBIDDEN_API) {
    assert.doesNotMatch(src, re, `${rel} must not import ${re}`);
  }
}

const narrativeApi = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/api/report-narrative-api.ts"),
  "utf8",
);
for (const re of FORBIDDEN_API) {
  assert.doesNotMatch(narrativeApi, re, `report-narrative-api must not reference ${re}`);
}

const reportComponents = path.join(process.cwd(), "components/report");
for (const file of collectTsFiles(reportComponents)) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  for (const re of FORBIDDEN_COMPONENTS) {
    assert.doesNotMatch(src, re, `${rel} must not import ${re}`);
  }
}

console.log("narrative-runtime-boundary.test.ts OK");
