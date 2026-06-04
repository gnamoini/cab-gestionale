import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAB_FOCUS_SCROLL_GROUP_ATTR,
  CAB_FOCUS_SCROLL_TITLE_ATTR,
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  computeKeyboardInset,
  minFocusScrollTop,
  MobileModalBehaviorLayer,
} from "@/lib/ui/mobile-modal-behavior";

const root = process.cwd();

assert.equal(CAB_MODAL_ROOT_ATTR, "data-cab-modal-root");
assert.equal(CAB_MODAL_SCROLL_ATTR, "data-cab-modal-scroll");
assert.equal(CAB_FOCUS_SCROLL_GROUP_ATTR, "data-cab-focus-scroll-group");
assert.equal(CAB_FOCUS_SCROLL_TITLE_ATTR, "data-cab-focus-scroll-title");

assert.equal(computeKeyboardInset(), 0);

assert.ok(MobileModalBehaviorLayer.scrollBodyMobileClass.includes("overflow-y-auto"));
assert.equal(MobileModalBehaviorLayer.zConfirm, "z-[120]");
assert.equal(MobileModalBehaviorLayer.focusScrollGroupAttr, CAB_FOCUS_SCROLL_GROUP_ATTR);

assert.equal(minFocusScrollTop(120, []), 120);
assert.equal(minFocusScrollTop(120, [80, 95]), 80);
assert.equal(minFocusScrollTop(50, [80, 95]), 50);

const behaviorSrc = readFileSync(join(root, "lib/ui/mobile-modal-behavior.ts"), "utf8");
assert.match(behaviorSrc, /getFocusScrollRect\(field\)/);
assert.match(behaviorSrc, /scrollRect\.top < visibleTop/);
assert.match(behaviorSrc, /findFieldLabelBlock/);

const formSectionSrc = readFileSync(
  join(root, "components/gestionale/schede/gestionale-form-section.tsx"),
  "utf8",
);
assert.match(formSectionSrc, /CAB_FOCUS_SCROLL_GROUP_ATTR/);

const lavorazioniSrc = readFileSync(
  join(root, "components/gestionale/lavorazioni/lavorazioni-modals.tsx"),
  "utf8",
);
assert.match(lavorazioniSrc, /CAB_FOCUS_SCROLL_GROUP_ATTR/);
assert.match(lavorazioniSrc, /CAB_FOCUS_SCROLL_TITLE_ATTR/);

const mezziSrc = readFileSync(join(root, "components/gestionale/mezzi/mezzi-view.tsx"), "utf8");
assert.match(mezziSrc, /CAB_FOCUS_SCROLL_GROUP_ATTR/);

const ricambioSrc = readFileSync(
  join(root, "components/gestionale/magazzino/ricambio-form-fields.tsx"),
  "utf8",
);
assert.match(ricambioSrc, /CAB_FOCUS_SCROLL_GROUP_ATTR/);
assert.match(ricambioSrc, /CAB_FOCUS_SCROLL_TITLE_ATTR/);

const keyboardHookSrc = readFileSync(join(root, "lib/ui/use-mobile-modal-keyboard.ts"), "utf8");
assert.match(keyboardHookSrc, /scrollFieldIntoModalView\(focused/);

console.log("mobile-modal-behavior.test.ts OK");
