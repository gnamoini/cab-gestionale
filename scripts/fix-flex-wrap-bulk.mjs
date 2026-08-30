#!/usr/bin/env node
/** Bulk fix unscoped flex-wrap: flex-wrap → flex-nowrap sm:flex-wrap */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function fixFlexWrapClass(cls) {
  if (!/(?<!(?:sm|md|lg|xl):)\bflex-wrap\b/.test(cls)) return cls;
  let next = cls.replace(/(?<!(?:sm|md|lg|xl):)\bflex-wrap\b/g, "").replace(/\s+/g, " ").trim();
  if (!/\bflex-nowrap\b/.test(next) && !/\bflex-col\b/.test(next)) {
    next = `${next} flex-nowrap`.trim();
  }
  if (!/(?:sm|md|lg|xl):flex-wrap/.test(next)) {
    next = `${next} sm:flex-wrap`.trim();
  }
  return next;
}

function fixFlexWrapInContent(content) {
  return content.replace(
    /className=(?:\{`([^`]+)`\}|"([^"]+)"|'([^']+)'|\{cn\(([^)]+)\)\})/g,
    (full, tpl, dbl, sgl, cn) => {
      const cls = tpl ?? dbl ?? sgl ?? cn;
      if (!/(?<!(?:sm|md|lg|xl):)\bflex-wrap\b/.test(cls)) return full;
      const next = fixFlexWrapClass(cls);
      if (next === cls) return full;
      return full.replace(cls, next);
    },
  );
}

const ownership = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/audit/lint-file-ownership-2026-08-29.json"), "utf8"),
);
const cleanFiles = new Set(
  ownership.files.filter((f) => f.ownership === "CLEAN").map((f) => f.file.replace(/\\/g, "/")),
);

let filesFixed = 0;
for (const rel of cleanFiles) {
  if (!rel.endsWith(".tsx") && !rel.endsWith(".ts")) continue;
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const orig = fs.readFileSync(abs, "utf8");
  if (!/\bflex-wrap\b/.test(orig)) continue;
  const next = fixFlexWrapInContent(orig);
  if (next !== orig) {
    fs.writeFileSync(abs, next);
    filesFixed++;
  }
}
console.log("flex-wrap bulk files fixed:", filesFixed);
