/**
 * Audit GlobalSelect selectOnly: toggle trigger senza race blur/click (no flash elenco).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const src = read("components/gestionale/global-input/global-select.tsx");

assert.match(src, /handleSelectOnlyTriggerMouseDown/);
assert.match(src, /handleSelectOnlyTriggerClick/);
assert.match(src, /onMouseDown=\{selectOnly \? handleSelectOnlyTriggerMouseDown/);
assert.match(src, /e\.preventDefault\(\)/);
assert.match(src, /if \(open\) \{\s*\n\s*dismissDropdown\(\)/);
assert.doesNotMatch(src, /if \(selectOnly\) \{\s*\n\s*setOpen\(true\)/);

console.log("global-select-dropdown-audit.test.ts OK");
