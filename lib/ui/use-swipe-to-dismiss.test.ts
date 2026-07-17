import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clampSwipeDismissDragX } from "@/lib/ui/use-swipe-to-dismiss";
import { shouldCommitGesture } from "@/lib/ui/mobile-nav-drawer-contract";

const root = process.cwd();

assert.equal(clampSwipeDismissDragX(-400, 320), -320);
assert.equal(clampSwipeDismissDragX(10, 320), 0);
assert.equal(shouldCommitGesture(100, 320, -0.5, "close"), true);

const dismissSrc = readFileSync(join(root, "lib/ui/use-swipe-to-dismiss.ts"), "utf8");
assert.match(dismissSrc, /requestAnimationFrame/);
assert.match(dismissSrc, /rubberBandDragX/);
assert.match(dismissSrc, /shouldCommitGesture/);

console.log("use-swipe-to-dismiss.test.ts ok");
