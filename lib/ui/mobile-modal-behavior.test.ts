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
  DESKTOP_FOCUS_EXTRA_TOP,
  minFocusScrollTop,
  MOBILE_FOCUS_EXTRA_TOP,
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
assert.equal(minFocusScrollTop(200, [60, 95, 110]), 60, "section title + label anchors pull scroll top up");

assert.ok(MOBILE_FOCUS_EXTRA_TOP >= 16);
assert.ok(DESKTOP_FOCUS_EXTRA_TOP < MOBILE_FOCUS_EXTRA_TOP);

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

assert.equal(
  computeFocusScrollDelta({ top: 55, bottom: 140, left: 0, right: 0 }, 50, 100),
  5,
  "tall scroll rect in narrow band: prefer deltaMax to keep section top near visibleTop",
);

const behaviorSrc = readFileSync(join(root, "lib/ui/mobile-modal-behavior.ts"), "utf8");
assert.match(behaviorSrc, /computeFocusScrollDelta/);
assert.match(behaviorSrc, /getFocusScrollBlockRect/);
assert.match(behaviorSrc, /shouldSkipGestionaleFocusScroll/);
assert.match(behaviorSrc, /completeGestionaleFocusScrollWithoutMove/);
assert.match(behaviorSrc, /isFocusScrollBlockFullyVisible/);
assert.match(behaviorSrc, /getFocusScrollRect\(field\)/);
assert.match(behaviorSrc, /computeFocusScrollDelta\(scrollRect/);
assert.match(behaviorSrc, /findFieldLabelBlock/);
assert.match(behaviorSrc, /findFocusScrollGroup/);
assert.match(behaviorSrc, /findGroupTitleElement/);
assert.match(behaviorSrc, /resolveFocusExtraTop/);
assert.match(behaviorSrc, /MOBILE_FOCUS_EXTRA_TOP/);
assert.match(behaviorSrc, /findModalHeaderBottom/);
assert.match(behaviorSrc, /findGestionaleFieldContainer/);
assert.match(behaviorSrc, /isGestionaleFocusableField/);
assert.match(behaviorSrc, /scrollGestionaleFieldIntoModal/);
assert.match(behaviorSrc, /scheduleGestionaleFieldScroll/);
assert.match(behaviorSrc, /isGestionaleListTriggerButton/);
assert.match(behaviorSrc, /isGestionaleStepperGroupButton/);
assert.match(
  behaviorSrc,
  /isGestionaleStepperGroupButton[\s\S]*input:not\(\[type="hidden"\]\)/,
  "stepper group requires input; segmented toggles excluded",
);
assert.match(
  behaviorSrc,
  /getFocusScrollRect[\s\S]*findGroupTitleElement/,
  "focus scroll includes section title in scroll rect",
);

assert.match(behaviorSrc, /scrollGestionaleFieldIntoView/);
assert.match(behaviorSrc, /getEffectiveVisibleBand/);
assert.match(behaviorSrc, /findStickyObstructions/);
assert.match(behaviorSrc, /focusScrollGeneration/);
assert.doesNotMatch(behaviorSrc, /focusScrollChain/);

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

const appShellSrc = readFileSync(join(root, "components/gestionale/app-shell.tsx"), "utf8");
const navDrawerStart = appShellSrc.indexOf("function MobileNavDrawer");
const navDrawerEnd = appShellSrc.indexOf("export function AppShell");
assert.ok(navDrawerStart >= 0 && navDrawerEnd > navDrawerStart, "MobileNavDrawer block expected");
const mobileNavDrawerBlock = appShellSrc.slice(navDrawerStart, navDrawerEnd);
assert.match(mobileNavDrawerBlock, /fixed inset-0 \$\{dsZModalHigh\} overscroll-none/);
assert.doesNotMatch(mobileNavDrawerBlock, /fixed inset-0 \$\{dsZModalHigh\} touch-none/);
assert.match(mobileNavDrawerBlock, /useBodyScrollLock/);
assert.match(mobileNavDrawerBlock, /useDialogFocusTrap/);
assert.match(mobileNavDrawerBlock, /edgeOpening/);
assert.match(mobileNavDrawerBlock, /cab-nav-drawer-backdrop[\s\S]*touch-none/);
assert.match(mobileNavDrawerBlock, /touch-pan-y/);
assert.match(mobileNavDrawerBlock, /cab-sidebar-nav/);
assert.match(mobileNavDrawerBlock, /shrink-0 grid grid-cols-\[1fr_auto_1fr\]/);

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
assert.match(keyboardHookSrc, /scrollGestionaleFieldIntoView\(resolveFocusScrollTarget\(focused\)/);
assert.match(keyboardHookSrc, /isVirtualKeyboardClosing/);
assert.match(keyboardHookSrc, /keyboardClosing/);
assert.match(keyboardHookSrc, /preserveModalScrollTop/);
assert.match(keyboardHookSrc, /keyboardClosing/);
assert.match(keyboardHookSrc, /subscribeGestionaleViewport/);
assert.doesNotMatch(keyboardHookSrc, /KEYBOARD_SETTLE_MS/);
assert.match(keyboardHookSrc, /resolveFocusExtraTop/);

console.log("mobile-modal-behavior.test.ts OK");
