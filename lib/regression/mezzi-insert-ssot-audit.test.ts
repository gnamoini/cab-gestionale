import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const WHITELIST = ["lib/domain/mezzo/mezzi-repository.ts"];

const EXCLUDE_DIRS = new Set(["node_modules", ".next", "dist", ".git"]);

function walk(dir: string, hits: string[]): void {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walk(rel, hits);
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;
    if (rel.includes(".test.")) continue;
    const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
    if (/\.from\(["']mezzi["']\)\.insert/.test(content)) {
      hits.push(rel);
    }
  }
}

const hits: string[] = [];
walk(".", hits);

const violations = hits.filter((h) => !WHITELIST.includes(h));
assert.equal(
  violations.length,
  0,
  `mezzi INSERT must only live in repository:\n${violations.join("\n")}`,
);

console.log("mezzi-insert-ssot-audit.test.ts OK");
