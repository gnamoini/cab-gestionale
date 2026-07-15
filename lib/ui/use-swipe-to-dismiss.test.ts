import assert from "node:assert/strict";
import { clampSwipeDismissDragX } from "@/lib/ui/use-swipe-to-dismiss";

assert.equal(clampSwipeDismissDragX(-160, 320), -160);
assert.equal(clampSwipeDismissDragX(-400, 320), -320);
assert.equal(clampSwipeDismissDragX(40, 320), 0);
assert.equal(clampSwipeDismissDragX(0, 320), 0);

/** ponytail: sanity check formula backdrop durante drag (speculare al hook). */
function backdropOpacityForDrag(dragX: number, width: number): number {
  return Math.max(0, Math.min(1, 1 + dragX / width));
}

assert.equal(backdropOpacityForDrag(0, 320), 1);
assert.equal(backdropOpacityForDrag(-160, 320), 0.5);
assert.equal(backdropOpacityForDrag(-320, 320), 0);
assert.ok(backdropOpacityForDrag(-250, 320) > backdropOpacityForDrag(-300, 320));

console.log("use-swipe-to-dismiss.test.ts ok");
