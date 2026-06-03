/**
 * UI Autonomy Fix — safety guard unit tests.
 */
import assert from "node:assert/strict";
import {
  isElementAllowlisted,
  validateFixSafety,
  wouldChangeLayoutHierarchy,
} from "@/lib/ui-autonomy-fix/fix-safety-guard";
import type { UIFix } from "@/lib/ui-autonomy-fix/fix-strategies";

const lowFix: UIFix = {
  target: "div.toolbar",
  issue: "test",
  rule: "flex-min-w-0",
  action: "fix-flex",
  classes: ["min-w-0"],
  safe: true,
  risk: "low",
  description: "flex min-w-0 added",
};

const highFix: UIFix = {
  ...lowFix,
  rule: "cross-instance-drift",
  risk: "high",
};

assert.equal(wouldChangeLayoutHierarchy(lowFix), false);

const fakeEl = {
  tagName: "DIV",
  className: "flex gap-4",
  childElementCount: 2,
  classList: { add: () => {} },
  getAttribute: () => null,
  querySelector: () => null,
  closest: () => null,
  matches: () => false,
} as unknown as HTMLElement;

/* Node without HTMLElement global */
const safetyLow = validateFixSafety(lowFix, fakeEl, "/magazzino");
if (typeof HTMLElement !== "undefined") {
  assert.equal(safetyLow.allowed, true);
} else {
  assert.equal(safetyLow.allowed, false);
}

const safetyHigh = validateFixSafety(highFix, fakeEl, "/magazzino");
assert.equal(safetyHigh.allowed, false);
assert.match(safetyHigh.reason ?? "", /high severity/i);

const kanbanEl = {
  tagName: "DIV",
  className: "lavorazioni-kanban-column",
  childElementCount: 1,
  getAttribute: () => null,
  closest: () => null,
  matches: () => false,
} as unknown as HTMLElement;
if (typeof HTMLElement !== "undefined") {
  assert.equal(isElementAllowlisted(kanbanEl, "/lavorazioni:kanban"), true);
}

const tableEl = {
  tagName: "TH",
  className: "px-2 py-2",
  childElementCount: 0,
  getAttribute: () => null,
  closest: () => null,
  matches: () => false,
} as unknown as HTMLElement;
if (typeof HTMLElement !== "undefined") {
  const safetyTable = validateFixSafety(lowFix, tableEl, "/lavorazioni");
  assert.equal(safetyTable.allowed, false);
  assert.match(safetyTable.reason ?? "", /structural table/i);
}

const unsafeFix: UIFix = { ...lowFix, safe: false };
const safetyUnsafe = validateFixSafety(unsafeFix, fakeEl, "/magazzino");
assert.equal(safetyUnsafe.allowed, false);

console.log("fix-safety-guard.test.ts OK");
