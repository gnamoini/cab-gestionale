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
assert.doesNotMatch(board, /nested/);

const view = fs.readFileSync(
  path.join(process.cwd(), "components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx"),
  "utf8",
);

assert.doesNotMatch(view, /isAttesaPreventivoStato/);
assert.doesNotMatch(view, /attesaPreventivoByStato/);
assert.doesNotMatch(view, /nested:/);

const css = fs.readFileSync(
  path.join(process.cwd(), "components/gestionale/lavorazioni/lavorazioni-scroll.css"),
  "utf8",
);

assert.match(css, /lavorazioni-kanban-mobile-panel:not\(\.lavorazioni-kanban-mobile-panel-open\)/);
assert.doesNotMatch(css, /data-overflowing/);

console.log("kanban-mobile-open-section.test.ts OK");
