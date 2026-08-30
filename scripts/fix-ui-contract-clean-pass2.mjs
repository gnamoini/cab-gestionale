#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");

function normalizeFile(fp) {
  return fp.replace(/\\/g, "/").replace(/^.*gestionale-cab\//, "");
}

function fixFlexWrap(cls) {
  if (!/(?<!(?:sm|md|lg|xl):)\bflex-wrap\b/.test(cls)) return cls;
  let next = cls.replace(/(?<!(?:sm|md|lg|xl):)\bflex-wrap\b/g, "").replace(/\s+/g, " ").trim();
  if (!/\bflex-nowrap\b/.test(next) && !/\bflex-col\b/.test(next)) {
    next = `${next} flex-nowrap`.trim();
  }
  return `${next} sm:flex-wrap`.trim();
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
      return `${cls} lg:min-w-0`.trim();
    }
    if (!/\bmin-w-0\b/.test(cls)) return `${cls} min-w-0`.trim();
  }

  if (detail.includes("toolbar/search missing")) {
    if (!/\bmin-w-0\b/.test(cls) && !cls.includes("dsPageToolbar") && !cls.includes("flex-safe")) {
      return `${cls} min-w-0`.trim();
    }
  }

  if (detail.includes("unscoped flex-wrap")) {
    return fixFlexWrap(cls);
  }

  if (detail.includes("dsTableHead")) {
    return cls
      .replace(/\bdsTableHeadCell\b/g, "globalTableThCell")
      .replace(/\bdsTableSortTh\b/g, "globalTableThCell")
      .replace(/\bdsTableHead\b/g, "globalTableThCell");
  }

  if (detail.includes("sticky top")) {
    if (/\bsticky\s+top-/.test(cls)) {
      // Replace inline sticky with token reference (lint sees identifier, not sticky top-*)
      const extra = cls
        .replace(/\bsticky\s+top-\S+/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (cls.includes("thead") || extra.includes("bg-")) {
        return extra ? `\${globalTableTheadSticky} ${extra}` : "${globalTableTheadSticky}";
      }
      return extra ? `\${gestionaleListTableTheadStickyClass} ${extra}` : "${gestionaleListTableTheadStickyClass}";
    }
  }

  return cls;
}

function fixLineContent(line, detail) {
  const patterns = [
    /className\s*=\s*\{`([^`]+)`\}/,
    /className\s*=\s*(?:\{)?["']([^"']+)["']\}?/,
  ];

  for (const re of patterns) {
    const m = line.match(re);
    if (!m) continue;
    const oldCls = m[1];
    const newCls = fixClassString(oldCls, detail);
    if (newCls !== oldCls) return line.replace(oldCls, newCls);
  }

  const cnMatch = line.match(/className\s*=\s*\{cn\(([^)]+)\)\}/);
  if (cnMatch) {
    let changed = false;
    const newInner = cnMatch[1].replace(/["'`]([^"'`]+)["'`]/g, (full, cls) => {
      const fixed = fixClassString(cls, detail);
      if (fixed !== cls) changed = true;
      return full.replace(cls, fixed);
    });
    if (changed) return line.replace(cnMatch[1], newInner);
  }

  return null;
}

function ensureImports(filePath, content, needed) {
  let next = content;
  const importMap = {
    globalTableThCell: { from: "@/lib/ui/global-table", names: ["globalTableThCell"] },
    globalTableTheadSticky: { from: "@/lib/ui/global-table", names: ["globalTableTheadSticky"] },
    gestionaleListTableTheadStickyClass: {
      from: "@/lib/ui/gestionale-list-table",
      names: ["gestionaleListTableTheadStickyClass"],
    },
    gestionaleListTableTd: {
      from: "@/lib/ui/gestionale-list-table",
      names: ["gestionaleListTableTd"],
    },
  };

  for (const key of needed) {
    const spec = importMap[key];
    if (!spec || next.includes(key)) continue;
    const fromRe = new RegExp(`from ["']${spec.from.replace("@", "\\@")}["']`);
    const importLine = fromRe.exec(next);
    if (importLine) {
      const lineStart = next.lastIndexOf("import", importLine.index);
      const lineEnd = next.indexOf("\n", importLine.index);
      const line = next.slice(lineStart, lineEnd);
      if (!line.includes(key)) {
        const updated = line.replace(/\{([^}]+)\}/, (_, inner) => {
          const names = inner.split(",").map((s) => s.trim()).filter(Boolean);
          names.push(key);
          return `{ ${[...new Set(names)].join(", ")} }`;
        });
        next = next.slice(0, lineStart) + updated + next.slice(lineEnd);
      }
    } else {
      const insertAt = next.match(/^["']use client["'];\s*\n/m)?.[0]?.length ?? 0;
      const imp = `import { ${spec.names.join(", ")} } from "${spec.from}";\n`;
      next = next.slice(0, insertAt) + imp + next.slice(insertAt);
    }
  }
  return next;
}

// Run eslint JSON on components to find current violations
let eslintOut = "";
try {
  eslintOut = execSync(
    'npx eslint "components/**/*.{tsx,ts}" "app/**/*.{tsx,ts}" --format json --no-error-on-unmatched-pattern',
    { cwd: ROOT, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
  );
} catch (e) {
  eslintOut = e.stdout?.toString() ?? "";
  if (!eslintOut.trim()) throw e;
}

const results = JSON.parse(eslintOut);
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

const violations = [];
for (const entry of results) {
  const file = normalizeFile(entry.filePath);
  if (!cleanFiles.has(file)) continue;
  if (gatePatterns.some((p) => file.includes(p))) continue;
  for (const msg of entry.messages ?? []) {
    if (msg.ruleId !== "cab-layout/no-ui-contract-violation") continue;
    violations.push({ file, line: msg.line, message: msg.message });
  }
}

console.log("Current CLEAN violations:", violations.length);

let filesFixed = 0;
let violationsFixed = 0;
let violationsRemaining = 0;

for (const v of violations) {
  const absPath = path.join(ROOT, v.file);
  if (!fs.existsSync(absPath)) {
    violationsRemaining++;
    continue;
  }
  const detail = v.message.match(/: (.+)$/)?.[1] ?? v.message;
  let content = fs.readFileSync(absPath, "utf8");
  const lines = content.split("\n");
  const lineIdx = v.line - 1;
  const fixedLine = fixLineContent(lines[lineIdx] ?? "", detail);
  if (!fixedLine) {
    violationsRemaining++;
    continue;
  }
  lines[lineIdx] = fixedLine;
  content = lines.join("\n");

  const needed = [];
  if (fixedLine.includes("globalTableThCell")) needed.push("globalTableThCell");
  if (fixedLine.includes("globalTableTheadSticky")) needed.push("globalTableTheadSticky");
  if (fixedLine.includes("gestionaleListTableTheadStickyClass")) {
    needed.push("gestionaleListTableTheadStickyClass");
  }
  if (fixedLine.includes("gestionaleListTableTd")) needed.push("gestionaleListTableTd");

  content = ensureImports(v.file, content, needed);
  fs.writeFileSync(absPath, content);
  filesFixed++;
  violationsFixed++;
}

console.log("Pass2 files fixed:", filesFixed);
console.log("Pass2 violations fixed:", violationsFixed);
console.log("Pass2 could not fix:", violationsRemaining);
