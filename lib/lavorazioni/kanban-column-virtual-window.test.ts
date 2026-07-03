import assert from "node:assert/strict";
import { sliceKanbanColumnWindow } from "@/lib/lavorazioni/kanban-column-virtual-window";

const items = Array.from({ length: 100 }, (_, i) => i);
const win = sliceKanbanColumnWindow(items, 920, 400);
assert.ok(win.start > 0);
assert.ok(win.end > win.start);
assert.ok(win.topSpacerPx > 0);

console.log("kanban-column-virtual-window.test.ts OK");
