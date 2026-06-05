import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_ROOTS = ["app", "components", "lib", "src", "context"] as const;
const SCAN_EXT = new Set([".ts", ".tsx"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

const INGEST_PATTERNS = [/ingest\//, /127\.0\.0\.1:7662/];
const LIB_DEBUG_REF = /lib\/debug\//;
const CONSOLE_LOG = /console\.log\s*\(/;

function normalizeRel(p: string): string {
  return p.replace(/\\/g, "/");
}

function walkSourceFiles(rootDir: string, base = rootDir): string[] {
  const out: string[] = [];
  if (!fs.existsSync(rootDir)) return out;
  for (const ent of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(rootDir, ent.name);
    if (ent.isDirectory()) {
      out.push(...walkSourceFiles(full, base));
      continue;
    }
    const ext = path.extname(ent.name);
    if (!SCAN_EXT.has(ext)) continue;
    out.push(normalizeRel(path.relative(base, full)));
  }
  return out;
}

function isTestFile(rel: string): boolean {
  return rel.endsWith(".test.ts") || rel.endsWith(".test.tsx");
}

const files: string[] = [];
for (const root of SCAN_ROOTS) {
  files.push(...walkSourceFiles(path.join(ROOT, root), ROOT));
}

const ingestHits: string[] = [];
const libDebugHits: string[] = [];
const consoleLogHits: string[] = [];

for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  for (const pat of INGEST_PATTERNS) {
    if (pat.test(src)) ingestHits.push(rel);
  }
  if (LIB_DEBUG_REF.test(src)) libDebugHits.push(rel);
  if (!isTestFile(rel) && (rel.startsWith("app/") || rel.startsWith("components/")) && CONSOLE_LOG.test(src)) {
    consoleLogHits.push(rel);
  }
}

assert.equal(
  ingestHits.length,
  0,
  `ingest URL in app runtime: ${ingestHits.join(", ") || "(none)"}`,
);
assert.equal(
  libDebugHits.length,
  0,
  `lib/debug references: ${libDebugHits.join(", ") || "(none)"}`,
);
assert.equal(
  consoleLogHits.length,
  0,
  `console.log in app/components: ${consoleLogHits.join(", ") || "(none)"}`,
);

console.log("debug-instrumentation-policy.test.ts OK");
