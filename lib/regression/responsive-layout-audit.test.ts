import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const auditSrc = readFileSync(join(process.cwd(), "lib/ui/responsive-layout-audit.ts"), "utf8");

assert.match(
  auditSrc,
  /if \(markedScope\) return true;/,
  "marked horizontal scroll scopes must skip viewport overflow audit without requiring overflow-x",
);

assert.match(
  auditSrc,
  /timesheet-presenze-grid/,
  "timesheet grid must stay in horizontal scroll scope markers",
);

console.log("responsive-layout-audit.test.ts OK");
