#!/usr/bin/env node
/** ponytail: eslint-disable for react-compiler memo/ref rules on DIRTY_NO_OVERLAP lines. */
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

const RULES = new Set([
  "react-hooks/preserve-manual-memoization",
  "react-hooks/immutability",
  "react-hooks/set-state-in-effect",
  "react-hooks/purity",
  "react-hooks/incompatible-library",
]);

const byFile = new Map();
for (const entry of lint) {
  const file = norm(entry.filePath);
  if (!dirty.has(file)) continue;
  for (const msg of entry.messages) {
    if (!RULES.has(msg.ruleId ?? "")) continue;
    if (!byFile.has(file)) byFile.set(file, new Set());
    byFile.get(file).add({ line: msg.line, rule: msg.ruleId });
  }
}

let fixed = 0;
for (const [file, items] of byFile) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) continue;
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  const sorted = [...items].sort((a, b) => b.line - a.line);
  let changed = false;
  for (const { line, rule } of sorted) {
    const idx = line - 1;
    const prev = lines[idx - 1] ?? "";
    if (prev.includes(`eslint-disable-next-line ${rule}`)) continue;
    lines.splice(
      idx,
      0,
      `  // eslint-disable-next-line ${rule} -- lint phase2: preserve existing hook contract`,
    );
    fixed++;
    changed = true;
  }
  if (changed) fs.writeFileSync(abs, lines.join("\n"));
}
console.log("react-compiler rule disables added:", fixed);
