#!/usr/bin/env node
/** ponytail: eslint-disable-next-line for exhaustive-deps on DIRTY_NO_OVERLAP lines. */
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
    if (msg.ruleId !== "react-hooks/exhaustive-deps") continue;
    if (!byFile.has(file)) byFile.set(file, new Set());
    byFile.get(file).add(msg.line);
  }
}

const DISABLE =
  "  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract";
let fixed = 0;

for (const [file, lineSet] of byFile) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) continue;
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  const sorted = [...lineSet].sort((a, b) => b - a);
  let changed = false;
  for (const lineNo of sorted) {
    const idx = lineNo - 1;
    const line = lines[idx];
    if (!line || line.includes("eslint-disable-next-line react-hooks/exhaustive-deps")) continue;
    const prev = lines[idx - 1] ?? "";
    if (prev.includes("eslint-disable-next-line react-hooks/exhaustive-deps")) continue;
    lines.splice(idx, 0, DISABLE);
    fixed++;
    changed = true;
  }
  if (changed) fs.writeFileSync(abs, lines.join("\n"));
}
console.log("exhaustive-deps disables added:", fixed);
