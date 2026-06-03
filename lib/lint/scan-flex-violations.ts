/**
 * Scan repo for flex overflow risks — SSOT analyzer + file allowlist.
 */

import fs from "node:fs";
import path from "node:path";
import {
  dedupeFlexBaselineEntries,
  type FlexBaselineEntry,
} from "@/lib/lint/flex-baseline-fingerprint";
import { analyzeClassNameForFlexOverflowRisk } from "@/lib/lint/rules/no-flex-overflow-risk";
import { FLEX_OVERFLOW_FILE_ALLOWLIST } from "@/lib/ui/global-flex-system";

const SCAN_DIRS = ["components", "app"];
const SKIP = new Set(["node_modules", ".next", "dist"]);
const EXT = new Set([".tsx", ".jsx"]);

export function extractClassStringsFromLine(line: string): string[] {
  const out: string[] = [];
  const patterns = [
    /className=\{[`"']([^`"']*)[`"']\}/g,
    /className="([^"]*)"/g,
    /className=\{`([^`]*)`\}/g,
    /className=`([^`]*)`/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (m[1]) out.push(m[1]);
    }
  }

  return out;
}

function isLineFileAllowlisted(relFile: string, line: string): boolean {
  return FLEX_OVERFLOW_FILE_ALLOWLIST.some(
    (a) => relFile === a.path.replace(/\\/g, "/") && a.pattern.test(line),
  );
}

export function scanFlexViolations(root = process.cwd()): FlexBaselineEntry[] {
  const entries: FlexBaselineEntry[] = [];

  function walk(dir: string, out: string[] = []): string[] {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full, out);
      else if (EXT.has(path.extname(ent.name))) out.push(full);
    }
    return out;
  }

  const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)));

  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const lines = fs.readFileSync(file, "utf8").split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/className=/.test(line)) continue;
      if (isLineFileAllowlisted(rel, line)) continue;

      for (const cls of extractClassStringsFromLine(line)) {
        const hit = analyzeClassNameForFlexOverflowRisk(cls);
        if (!hit) continue;
        entries.push({ file: rel, line: i + 1, reason: hit.reason });
      }
    }
  }

  return dedupeFlexBaselineEntries(entries);
}
