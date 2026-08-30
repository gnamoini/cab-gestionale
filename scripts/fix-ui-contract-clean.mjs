#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/audit/lint-baseline-raw.json"), "utf8"));
const ownership = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/audit/lint-file-ownership-2026-08-29.json"), "utf8"),
);

const cleanFiles = new Set(
  ownership.files.filter((f) => f.ownership === "CLEAN").map((f) => f.file.replace(/\\/g, "/")),
);
const gatePatterns = [
  ".github/workflows/release-gate.yml",
  "docs/release-gate-contract",
  "lib/control/release-ready-contract",
];

function normalizeFile(fp) {
  return fp.replace(/\\/g, "/").replace(/^.*gestionale-cab\//, "");
}

const violations = [];
for (const entry of baseline) {
  const file = normalizeFile(entry.filePath);
  if (!cleanFiles.has(file)) continue;
  if (gatePatterns.some((p) => file.includes(p))) continue;
  for (const msg of entry.messages ?? []) {
    if (msg.ruleId !== "cab-layout/no-ui-contract-violation") continue;
    violations.push({ file, line: msg.line, message: msg.message });
  }
}

console.log("Total CLEAN violations:", violations.length);
const byFile = {};
for (const v of violations) byFile[v.file] = (byFile[v.file] || 0) + 1;
console.log("Unique CLEAN files:", Object.keys(byFile).length);

const byDetail = {};
for (const v of violations) {
  const m = v.message.match(/: (.+)$/);
  const detail = m ? m[1] : v.message;
  byDetail[detail] = (byDetail[detail] || 0) + 1;
}
console.log("By detail:", JSON.stringify(byDetail, null, 2));

// Group by file for fixing
const fileViolations = {};
for (const v of violations) {
  (fileViolations[v.file] ??= []).push(v);
}

const CONTAINMENT_MARKERS = [
  "min-w-0", "flex-fill", "flex-fill-safe", "flex-safe", "flex-safe-row",
  "flex-safe-col", "flex-safe-item", "text-safe", "layoutFlexFill", "layoutFlexSafe",
  "layoutFlexColSafe", "layoutFlexChildSafe", "gestionaleModalBodyFlexClass",
  "dsScrollPanel", "layoutModalBodySafe",
];

function hasContainment(cls) {
  return CONTAINMENT_MARKERS.some((m) => cls.includes(m));
}

function fixClassString(cls, detail) {
  if (!cls.trim()) return cls;

  if (detail.includes("prevTableTd")) {
    return cls.replace(/\bprevTableTd\b/g, "gestionaleListTableTd");
  }

  if (detail.includes("dsStickyToolbar")) {
    return cls.replace(/\bdsStickyToolbar\b/g, "dsPageToolbar");
  }

  if (detail.includes("flex-1/grow without")) {
    if (/\blg:flex-1\b/.test(cls) && !/\blg:min-w-0\b/.test(cls)) {
      return cls + " lg:min-w-0";
    }
    if (!/\bmin-w-0\b/.test(cls) && !hasContainment(cls)) {
      return cls.trimEnd() + " min-w-0";
    }
  }

  if (detail.includes("toolbar/search missing")) {
    if (!/\bmin-w-0\b/.test(cls) && !hasContainment(cls)) {
      if (cls.includes("dsPageToolbar") || cls.includes("flex-safe")) return cls;
      return cls.trimEnd() + " min-w-0";
    }
  }

  if (detail.includes("unscoped flex-wrap")) {
    if (!/\bmin-w-0\b/.test(cls) && !hasContainment(cls)) {
      return cls.trimEnd() + " min-w-0";
    }
  }

  if (detail.includes("dsTableHead")) {
    // Can't auto-fix deprecated table head tokens reliably
    return cls;
  }

  return cls;
}

function fixLineContent(line, detail) {
  // Fix className="..." or className={'...'} or template literals on one line
  const classNameMatch = line.match(/className\s*=\s*/);
  if (!classNameMatch) return null;

  // String literal: className="foo" or className={'foo'}
  const strMatch = line.match(/className\s*=\s*(?:\{)?["'`]([^"'`]+)["'`]\}?/);
  if (strMatch) {
    const oldCls = strMatch[1];
    const newCls = fixClassString(oldCls, detail, "");
    if (newCls === oldCls) return null;
    return line.replace(oldCls, newCls);
  }

  // Template literal on same line
  const tplMatch = line.match(/className\s*=\s*\{`([^`]+)`\}/);
  if (tplMatch) {
    const oldCls = tplMatch[1];
    const newCls = fixClassString(oldCls, detail, "");
    if (newCls === oldCls) return null;
    return line.replace(oldCls, newCls);
  }

  // cn(...) call
  const cnMatch = line.match(/className\s*=\s*\{cn\(([^)]+)\)\}/);
  if (cnMatch) {
    let changed = false;
    const newCn = cnMatch[1].replace(/["'`]([^"'`]+)["'`]/g, (full, cls) => {
      const fixed = fixClassString(cls, detail, "");
      if (fixed !== cls) changed = true;
      return full.replace(cls, fixed);
    });
    if (!changed) return null;
    return line.replace(cnMatch[1], newCn);
  }

  return null;
}

let filesFixed = 0;
let violationsFixed = 0;
let violationsRemaining = 0;
const fixedFiles = [];
const unfixed = [];

for (const [file, fileViols] of Object.entries(fileViolations)) {
  const absPath = path.join(ROOT, file);
  if (!fs.existsSync(absPath)) {
    unfixed.push({ file, reason: "file not found" });
    continue;
  }

  const lines = fs.readFileSync(absPath, "utf8").split("\n");
  let fileChanged = false;
  let fileFixedCount = 0;

  for (const v of fileViols) {
    const lineIdx = v.line - 1;
    const detail = v.message.match(/: (.+)$/)?.[1] ?? v.message;
    const originalLine = lines[lineIdx];
    if (!originalLine) {
      violationsRemaining++;
      unfixed.push({ file, line: v.line, reason: "line out of range" });
      continue;
    }

    const fixed = fixLineContent(originalLine, detail);
    if (fixed) {
      lines[lineIdx] = fixed;
      fileChanged = true;
      fileFixedCount++;
      violationsFixed++;
    } else {
      violationsRemaining++;
      unfixed.push({ file, line: v.line, detail, line: originalLine.trim().slice(0, 120) });
    }
  }

  if (fileChanged) {
    fs.writeFileSync(absPath, lines.join("\n"));
    filesFixed++;
    fixedFiles.push({ file, count: fileFixedCount });
  }
}

console.log("\n=== FIX RESULTS ===");
console.log("Files fixed:", filesFixed);
console.log("Violations fixed:", violationsFixed);
console.log("Violations remaining (could not auto-fix):", violationsRemaining);
console.log("Unfixed samples:", JSON.stringify(unfixed.slice(0, 20), null, 2));
