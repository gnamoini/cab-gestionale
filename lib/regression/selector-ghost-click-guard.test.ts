/**
 * Guard click fantasma dopo chiusura bottom sheet mobile.
 */
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  __resetSelectorGhostClickGuardForTests,
  armSelectorGhostClickGuard,
} from "@/lib/selector-interaction/suppress-selector-ghost-click";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "https://gestionale.local/",
});
const { document } = dom.window;
(globalThis as { document?: Document }).document = document;

function dispatch(type: string): Event {
  const e = document.createEvent("Event");
  e.initEvent(type, true, true);
  document.dispatchEvent(e);
  return e;
}

__resetSelectorGhostClickGuardForTests();

armSelectorGhostClickGuard();
const first = dispatch("click");
assert.equal(first.defaultPrevented, true, "first ghost click must be blocked");

const second = dispatch("click");
assert.equal(second.defaultPrevented, false, "intentional follow-up click must pass");

__resetSelectorGhostClickGuardForTests();

armSelectorGhostClickGuard();
armSelectorGhostClickGuard();
const afterRearm = dispatch("click");
assert.equal(afterRearm.defaultPrevented, true, "re-arm must not disarm before first ghost click");

__resetSelectorGhostClickGuardForTests();

console.log("selector-ghost-click-guard.test.ts OK");
