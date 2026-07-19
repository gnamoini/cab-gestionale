import assert from "node:assert/strict";
import {
  isScrollAtTop,
  isVerticalPullGesture,
  pullProgress,
  PTR_COMMIT_PX,
  PTR_MAX_PULL_PX,
  rubberBandPullY,
  shouldCommitPullToRefresh,
} from "@/lib/ui/pull-to-refresh-contract";

assert.equal(shouldCommitPullToRefresh(PTR_COMMIT_PX - 1), false);
assert.equal(shouldCommitPullToRefresh(PTR_COMMIT_PX), true);
assert.equal(shouldCommitPullToRefresh(PTR_COMMIT_PX + 40), true);

assert.equal(rubberBandPullY(40), 40);
assert.equal(rubberBandPullY(PTR_MAX_PULL_PX), PTR_MAX_PULL_PX);
assert.ok(rubberBandPullY(PTR_MAX_PULL_PX + 100) > PTR_MAX_PULL_PX);
assert.ok(rubberBandPullY(PTR_MAX_PULL_PX + 100) <= PTR_MAX_PULL_PX + 24);

assert.equal(isVerticalPullGesture(10, 20), true);
assert.equal(isVerticalPullGesture(20, 10), false);
assert.equal(isVerticalPullGesture(0, -5), false);

assert.equal(pullProgress(0), 0);
assert.equal(pullProgress(PTR_COMMIT_PX / 2), 0.5);
assert.equal(pullProgress(PTR_COMMIT_PX), 1);
assert.equal(pullProgress(PTR_COMMIT_PX * 2), 1);

assert.equal(isScrollAtTop(0), true);
assert.equal(isScrollAtTop(1), true);
assert.equal(isScrollAtTop(2), false);

console.log("pull-to-refresh-contract.test.ts OK");
