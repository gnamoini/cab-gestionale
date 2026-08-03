import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clampToastSwipeDragX,
  shouldCommitToastSwipe,
} from "@/lib/ui/use-toast-swipe-dismiss";

assert.equal(clampToastSwipeDragX(-20, 320), 0);
assert.equal(clampToastSwipeDragX(400, 320), 320);
assert.equal(clampToastSwipeDragX(100, 320), 100);

assert.equal(shouldCommitToastSwipe(128, 320, 0), true);
assert.equal(shouldCommitToastSwipe(50, 320, 0), false);
assert.equal(shouldCommitToastSwipe(10, 320, 0.4), true);
assert.equal(shouldCommitToastSwipe(10, 320, 0.2), false);

const src = readFileSync(join(process.cwd(), "lib/ui/use-toast-swipe-dismiss.ts"), "utf8");
assert.match(src, /shouldCommitToastSwipe/);
assert.match(src, /onDismiss\(\)/);
assert.match(src, /prefersReducedMotion/);

console.log("use-toast-swipe-dismiss.test.ts ok");
