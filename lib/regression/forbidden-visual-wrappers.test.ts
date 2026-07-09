import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FORBIDDEN_REPORT_VISUAL_WRAPPER_PATTERNS } from "@/components/report/design-system/contracts/forbidden-visual-wrappers";

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, "components/report");

function listTsx(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "design-system") continue;
      out.push(...listTsx(full));
    } else if (ent.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

for (const file of listTsx(REPORT_DIR)) {
  const base = path.basename(file, ".tsx");
  for (const pattern of FORBIDDEN_REPORT_VISUAL_WRAPPER_PATTERNS) {
    assert.doesNotMatch(base, pattern, `${path.relative(ROOT, file)}: naming dominio vietato`);
  }
}

console.log("forbidden-visual-wrappers.test.ts OK");
