import assert from "node:assert/strict";
import {
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  computeKeyboardInset,
  MobileModalBehaviorLayer,
} from "@/lib/ui/mobile-modal-behavior";

assert.equal(CAB_MODAL_ROOT_ATTR, "data-cab-modal-root");
assert.equal(CAB_MODAL_SCROLL_ATTR, "data-cab-modal-scroll");

assert.equal(computeKeyboardInset(), 0);

assert.ok(MobileModalBehaviorLayer.scrollBodyMobileClass.includes("overflow-y-auto"));
assert.equal(MobileModalBehaviorLayer.zConfirm, "z-[120]");

console.log("mobile-modal-behavior.test.ts OK");
