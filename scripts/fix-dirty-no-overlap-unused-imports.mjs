#!/usr/bin/env node
/** ponytail: one-off — remove unused named imports flagged on DIRTY_NO_OVERLAP files. */
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
    const m = msg.message.match(/^'([^']+)' is (?:defined|assigned)/);
    if (!m) continue;
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push({ line: msg.line, name: m[1] });
  }
}

function removeFromImportLine(line, name) {
  if (!line.includes("import")) return null;
  // type-only import { type Foo, Bar }
  const typeRe = new RegExp(`\\btype\\s+${name}\\b,?\\s*`);
  if (typeRe.test(line)) {
    const next = line.replace(typeRe, "").replace(/,\s*,/g, ", ").replace(/\{\s*,/g, "{ ").replace(/,\s*\}/g, " }");
    if (/import\s*\{\s*\}\s*from/.test(next)) return null;
    return next;
  }
  const namedRe = new RegExp(`\\b${name}\\b\\s*,?\\s*`);
  if (!namedRe.test(line)) return null;
  let next = line.replace(namedRe, "");
  next = next.replace(/,\s*,/g, ", ").replace(/\{\s*,/g, "{ ").replace(/,\s*\}/g, " }");
  if (/import\s*\{\s*\}\s*from/.test(next)) return null;
  return next;
}

let fixed = 0;
for (const [file, items] of byFile) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) continue;
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  const namesByLine = new Map();
  for (const { line, name } of items) {
    if (!namesByLine.has(line)) namesByLine.set(line, new Set());
    namesByLine.get(line).add(name);
  }
  let changed = false;
  for (const [lineNo, names] of namesByLine) {
    const idx = lineNo - 1;
    const line = lines[idx];
    if (!line) continue;
    let next = line;
    for (const name of names) {
      if (line.includes(" is assigned a value but never used")) continue;
      const updated = removeFromImportLine(next, name);
      if (updated && updated !== next) {
        next = updated;
        fixed++;
      }
    }
    if (next !== line) {
      lines[idx] = next;
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(abs, lines.join("\n"));
}

console.log("removed unused import symbols:", fixed);
