import assert from "node:assert/strict";
import {
  computeFocusScrollDelta,
  resolveFocusPositionMode,
} from "@/lib/ui/mobile-modal-behavior";
import { isMobileFocusVisibilityV2 } from "@/lib/ui/focus-visibility-flags";
import {
  getActiveFocusTransaction,
  resetFocusVisibilityPipelineForTests,
} from "@/lib/ui/focus-visibility-pipeline";

assert.equal(isMobileFocusVisibilityV2(), process.env.NEXT_PUBLIC_MOBILE_FOCUS_VISIBILITY_V2 !== "false");

assert.equal(
  computeFocusScrollDelta({ top: 100, bottom: 150, left: 0, right: 0 }, 50, 200),
  0,
  "fully visible block → zero delta",
);

assert.equal(
  resolveFocusPositionMode({ getAttribute: () => null, closest: () => null } as unknown as HTMLElement),
  "aboveKeyboard",
);

resetFocusVisibilityPipelineForTests();
assert.equal(getActiveFocusTransaction(), null);

console.log("focus-visibility-pipeline.test.ts OK");
