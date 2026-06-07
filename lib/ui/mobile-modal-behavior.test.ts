import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAB_FOCUS_SCROLL_GROUP_ATTR,
  CAB_FOCUS_SCROLL_TITLE_ATTR,
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  computeFocusScrollDelta,
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

assert.equal(computeFocusScrollDelta({ top: 100, bottom: 150, left: 0, right: 0 }, 50, 200), 0);

assert.equal(
  computeFocusScrollDelta({ top: 100, bottom: 180, left: 0, right: 0 }, 50, 160),
  20,
  "keyboard shrinks viewport: scroll down but keep label in band",
);

assert.equal(
  computeFocusScrollDelta({ top: 100, bottom: 180, left: 0, right: 0 }, 50, 120),
  50,
  "infeasible band: anchor label at visibleTop",
);

assert.equal(
  computeFocusScrollDelta({ top: 40, bottom: 90, left: 0, right: 0 }, 55, 200),
  -15,
  "field too high: scroll up",
);

const behaviorSrc = readFileSync(join(root, "lib/ui/mobile-modal-behavior.ts"), "utf8");
assert.match(behaviorSrc, /computeFocusScrollDelta/);
assert.match(behaviorSrc, /getFocusScrollRect\(field\)/);
assert.match(behaviorSrc, /computeFocusScrollDelta\(scrollRect/);
assert.match(behaviorSrc, /findFieldLabelBlock/);
assert.match(behaviorSrc, /findModalHeaderBottom/);
assert.match(behaviorSrc, /findGestionaleFieldContainer/);
assert.match(behaviorSrc, /isGestionaleFocusableField/);
assert.match(behaviorSrc, /scrollGestionaleFieldIntoModal/);
assert.match(behaviorSrc, /scheduleGestionaleFieldScroll/);
assert.match(behaviorSrc, /isGestionaleListTriggerButton/);
assert.doesNotMatch(
  behaviorSrc,
  /getFocusScrollRect[\s\S]*findGroupTitleElement/,
  "focus scroll must not pull section title into view",
);

const selectSrc = readFileSync(
  join(root, "components/gestionale/global-input/global-select.tsx"),
  "utf8",
);
assert.match(selectSrc, /scheduleGestionaleFieldScroll/);

const pillSrc = readFileSync(
  join(root, "components/gestionale/global-input/global-fixed-list-pill.tsx"),
  "utf8",
);
assert.match(pillSrc, /scheduleGestionaleFieldScroll/);

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
assert.match(lavorazioniSrc, /useMaxMdDown/);
assert.match(lavorazioniSrc, /CAB_MODAL_SCROLL_ATTR/);
assert.match(lavorazioniSrc, /gestionaleModalScrollBodyMobileClass/);
assert.match(lavorazioniSrc, /max-md:flex-none max-md:overflow-visible/);

const scrollBodySrc = readFileSync(
  join(root, "components/gestionale/mobile-modal-scroll-body.tsx"),
  "utf8",
);
assert.match(scrollBodySrc, /useMaxMdDown/);
assert.match(scrollBodySrc, /!maxMdDown \? \{ \[CAB_MODAL_SCROLL_ATTR\]/);

const modalBodyClassSrc = readFileSync(join(root, "lib/ui/modal-max-width-class.ts"), "utf8");
assert.match(modalBodyClassSrc, /max-md:flex-none max-md:overflow-visible/);

const dsModalSrc = readFileSync(join(root, "components/design-system/modal.tsx"), "utf8");
assert.match(dsModalSrc, /LavorazioniModalShell/);
assert.match(dsModalSrc, /GestionaleModalScrollBody/);

const dsDrawerSrc = readFileSync(join(root, "components/design-system/drawer.tsx"), "utf8");
assert.match(dsDrawerSrc, /useMaxMdDown/);

const mezziSrc = readFileSync(join(root, "components/gestionale/mezzi/mezzi-form-fields.tsx"), "utf8");
assert.match(mezziSrc, /CAB_FOCUS_SCROLL_GROUP_ATTR/);

const ricambioSrc = readFileSync(
  join(root, "components/gestionale/magazzino/ricambio-form-fields.tsx"),
  "utf8",
);
assert.match(ricambioSrc, /CAB_FOCUS_SCROLL_GROUP_ATTR/);
assert.match(ricambioSrc, /CAB_FOCUS_SCROLL_TITLE_ATTR/);
assert.match(ricambioSrc, /CAB_FIELD_LABEL_ATTR/);

const keyboardHookSrc = readFileSync(join(root, "lib/ui/use-mobile-modal-keyboard.ts"), "utf8");
assert.match(keyboardHookSrc, /scrollGestionaleFieldIntoModal\(resolveFocusScrollTarget\(focused\)/);
assert.match(keyboardHookSrc, /isVirtualKeyboardClosing/);
assert.match(keyboardHookSrc, /keyboardClosing/);
assert.match(keyboardHookSrc, /preserveModalScrollTop/);
assert.match(keyboardHookSrc, /if \(closing\)/);

console.log("mobile-modal-behavior.test.ts OK");
