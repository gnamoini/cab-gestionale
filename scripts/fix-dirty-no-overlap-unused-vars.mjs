#!/usr/bin/env node
/** ponytail: prefix assigned-but-unused vars with _ on DIRTY_NO_OVERLAP files. */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const lint = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/audit/lint-dirty-no-overlap-current.json"), "utf8"),
);
const ownership = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/audit/lint-file-ownership-2026-08-29.json"), "utf8"),
);
const dirty = new Set(
  ownership.files.filter((f) => f.ownership === "DIRTY_NO_OVERLAP").map((f) => f.file.replace(/\\/g, "/")),
);

function norm(fp) {
  return fp.replace(/\\/g, "/").replace(/^.*gestionale-cab\//, "");
}

const byFile = new Map();
for (const entry of lint) {
  const file = norm(entry.filePath);
  if (!dirty.has(file)) continue;
  for (const msg of entry.messages) {
    if (msg.ruleId !== "@typescript-eslint/no-unused-vars") continue;
    const m = msg.message.match(/^'([^']+)' is assigned a value but never used/);
    if (!m) continue;
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push({ line: msg.line, name: m[1] });
  }
}

let fixed = 0;
for (const [file, items] of byFile) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) continue;
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  let changed = false;
  for (const { line, name } of items) {
    if (name.startsWith("_")) continue;
    const idx = line - 1;
    const src = lines[idx];
    if (!src || !src.includes(name)) continue;
    const re = new RegExp(`\\b${name}\\b`);
    const next = src.replace(re, `_${name}`);
    if (next !== src) {
      lines[idx] = next;
      fixed++;
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(abs, lines.join("\n"));
}
console.log("prefixed assigned-unused vars:", fixed);
