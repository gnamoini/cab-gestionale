import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const AI_FILES = [
  "lib/ai/report-analysis.ts",
  "lib/ai/listino-import-analysis.ts",
  "lib/ai/magazzino-categoria-classify.ts",
  "lib/ai/extraction/ai-extraction-service.ts",
  "lib/document-capture/analyze-capture.server.ts",
  "lib/document-capture/pipeline/analyze-capture-v41.server.ts",
  "lib/ordini-fornitori/import/ordine-fornitore-import-analysis.ts",
];

const FORBIDDEN = [
  /process\.env\.GEMINI_API_KEY/,
  /process\.env\.GOOGLE_GENERATIVE_AI_API_KEY/,
  /process\.env\.GOOGLE_API_KEY/,
  /from ["']@\/lib\/ai\/gemini-client["']/,
  /from ["']@ai-sdk\/google["']/,
];

const ALLOWED_GEMINI = new Set([
  path.join(ROOT, "lib/ai/gemini-generate-object.server.ts"),
  path.join(ROOT, "lib/ai/gemini-client.ts"),
  path.join(ROOT, "lib/ai/gemini-api-keys.ts"),
]);

for (const rel of AI_FILES) {
  const abs = path.join(ROOT, rel);
  const src = fs.readFileSync(abs, "utf8");
  for (const re of FORBIDDEN) {
    assert.doesNotMatch(src, re, `${rel} must use aiService runtime only`);
  }
  assert.match(src, /aiService|@\/lib\/ai\/runtime\/service/, `${rel} must import aiService`);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const runtimeDir = path.join(ROOT, "lib/ai/runtime");
const opsDebug = path.join(ROOT, "lib/ops/ai-runtime-debug.server.ts");

for (const file of walk(ROOT)) {
  if (file.includes(`${path.sep}lib${path.sep}ai${path.sep}runtime${path.sep}`)) continue;
  if (file === opsDebug) continue;
  if (ALLOWED_GEMINI.has(file)) continue;
  if (file.includes(".test.ts")) continue;
  if (file.includes(`${path.sep}lib${path.sep}ai${path.sep}gemini`)) continue;
  const src = fs.readFileSync(file, "utf8");
  if (/process\.env\.(GEMINI_|GOOGLE_GENERATIVE|GOOGLE_API_KEY)/.test(src)) {
    assert.fail(`${file} reads AI env directly — use lib/ai/runtime/env-reader`);
  }
}

assert.ok(fs.existsSync(path.join(runtimeDir, "service.ts")));

console.log("ai-runtime-ssot.test.ts OK");
