import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createModalBackdropDismissState,
  onModalBackdropPointerDown,
  onModalBackdropPointerUp,
  onModalDialogPointerDown,
} from "@/lib/ui/modal-backdrop-dismiss";

const ROOT = process.cwd();
const modalShellSrc = fs.readFileSync(
  path.join(ROOT, "components/gestionale/gestionale-modal-shell.tsx"),
  "utf8",
);
assert.match(modalShellSrc, /onModalBackdropPointerDown/);
assert.match(modalShellSrc, /onModalBackdropPointerUp/);
assert.doesNotMatch(modalShellSrc, /onMouseDown=\{\(e\) => \{\s*if \(e\.target === e\.currentTarget\)/);

const backdrop = { id: "backdrop" };
const dialog = { id: "dialog" };

function pointerdownInsideThenUpOutside(): boolean {
  const state = createModalBackdropDismissState();
  onModalDialogPointerDown(state);
  return onModalBackdropPointerUp(state, backdrop, backdrop);
}

function pointerdownOutsideThenUpOutside(): boolean {
  const state = createModalBackdropDismissState();
  onModalBackdropPointerDown(state, backdrop, backdrop);
  return onModalBackdropPointerUp(state, backdrop, backdrop);
}

assert.equal(
  pointerdownInsideThenUpOutside(),
  false,
  "pointerdown inside dialog → pointerup on backdrop must NOT close",
);

assert.equal(
  pointerdownOutsideThenUpOutside(),
  true,
  "pointerdown on backdrop → pointerup on backdrop must close",
);

const cancelMidGesture = createModalBackdropDismissState();
onModalBackdropPointerDown(cancelMidGesture, backdrop, backdrop);
onModalDialogPointerDown(cancelMidGesture);
assert.equal(
  onModalBackdropPointerUp(cancelMidGesture, backdrop, backdrop),
  false,
  "pointerdown backdrop then pointerdown dialog cancels dismiss",
);

console.log("modal-backdrop-dismiss.test.ts OK");
