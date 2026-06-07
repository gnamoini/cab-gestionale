/**
 * Impostazioni workspace — ordine hook / TDZ pageMode.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const shellPath = path.join(ROOT, "components/dashboard/settings/settings-workspace-shell.tsx");
const source = fs.readFileSync(shellPath, "utf8");

const hookBlock = source.match(/useUndoableConfigurazioneSave\(\{[\s\S]*?\}\);/);
assert.ok(hookBlock, "useUndoableConfigurazioneSave call must exist in settings-workspace-shell");

assert.match(
  hookBlock[0],
  /enabled:\s*open\s*&&\s*surface\s*===\s*["']page["']/,
  "undo hook must use surface === 'page' (avoid pageMode TDZ)",
);

assert.doesNotMatch(
  hookBlock[0],
  /\bpageMode\b/,
  "undo hook enabled must not reference pageMode",
);

console.log("settings-workspace-hook-order.test.ts: OK");
