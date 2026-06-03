/**
 * Kanban mobile: accordion non deve ri-aprire la sezione dopo collapse su re-render del parent.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const board = fs.readFileSync(
  path.join(process.cwd(), "components/gestionale/lavorazioni/lavorazioni-kanban-mobile-board.tsx"),
  "utf8",
);

assert.match(board, /lastSyncedSectionIdsKeyRef/);
assert.match(board, /if \(lastSyncedSectionIdsKeyRef\.current === sectionIdsKey\) return/);
assert.match(board, /prev === id \? "" : id/);
