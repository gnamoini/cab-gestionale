import assert from "node:assert/strict";
import { columnHasVerticalOverflow } from "@/lib/lavorazioni/kanban-column-overflow";

function mockEl(scrollHeight: number, clientHeight: number): HTMLElement {
  return { scrollHeight, clientHeight } as HTMLElement;
}

assert.equal(columnHasVerticalOverflow(mockEl(100, 100)), false);
assert.equal(columnHasVerticalOverflow(mockEl(101, 100)), false);
assert.equal(columnHasVerticalOverflow(mockEl(102, 100)), true);
assert.equal(columnHasVerticalOverflow(mockEl(100.5, 100)), false);
console.log("kanban-column-overflow.test.ts OK");
