/**
 * Audit statico SSOT focus/scroll/viewport mobile.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const behavior = read("lib/ui/mobile-modal-behavior.ts");
const pipeline = read("lib/ui/focus-visibility-pipeline.ts");
const flags = read("lib/ui/focus-visibility-flags.ts");
const debug = read("lib/ui/focus-visibility-debug.ts");
const orchestrator = read("lib/ui/gestionale-viewport-orchestrator.ts");
const keyboardHook = read("lib/ui/use-mobile-modal-keyboard.ts");
const modalFocus = read("components/gestionale/gestionale-modal-focus.ts");
const formField = read("components/design-system/form-field.tsx");
const iosStability = read("src/components/ios-interaction-stability.tsx");
const overlayBehavior = read("lib/ui/use-gestionale-overlay-behavior.ts");
const dropdownPortal = read("lib/ui/global-dropdown-portal.ts");
const dropdownHook = read("components/gestionale/global-input/use-global-dropdown-portal.ts");
const selectSrc = read("components/gestionale/global-input/global-select.tsx");
const pillSrc = read("components/gestionale/global-input/global-fixed-list-pill.tsx");
const filterDrawer = read("components/gestionale/mobile-filter-drawer.tsx");
const confirmDialog = read("components/gestionale/gestionale-confirm-dialog-impl.tsx");
const textarea = read("components/gestionale/gestionale-textarea.tsx");
const textareaViewport = read("lib/ui/gestionale-textarea-viewport.ts");
const settingsNavShell = read("components/dashboard/settings/settings-nav-shell.tsx");
const schedeModal = read("components/lavorazioni/schede/schede-lavorazione-modal.tsx");
const schedaRicambiBody = read("components/lavorazioni/schede/scheda-ricambi-form-body.tsx");
const mezzoAc = read("components/gestionale/gestionale-mezzo-autocomplete.tsx");
const bottomSheet = read("components/gestionale/gestionale-mobile-bottom-sheet.tsx");
const searchableSheet = read("components/gestionale/global-input/gestionale-searchable-sheet-select.tsx");

assert.match(behavior, /getFocusScrollBlockRect/);
assert.match(behavior, /MOBILE_KEYBOARD_FOCUS_EXTRA_BOTTOM/);
assert.match(behavior, /resolveFocusScrollRectForDelta/);
assert.match(behavior, /findStickyObstructions/);
assert.match(behavior, /scrollGestionaleFieldIntoView/);
assert.match(behavior, /GESTIONALE_PAGE_SCROLL_SELECTOR/);
assert.match(behavior, /findGestionaleScrollContainer/);
assert.match(behavior, /GESTIONALE_FOCUS_SCROLL_COALESCE_MS/);
assert.match(behavior, /shouldSkipRedundantGestionaleFocusScroll/);
assert.match(behavior, /markGestionaleFocusScrollCompleted/);
assert.doesNotMatch(behavior, /run\("smooth"\)/, "focus scroll must not use smooth+auto double pass");
assert.doesNotMatch(behavior, /await import\("@\/lib\/ui\/gestionale-viewport-orchestrator"\)/);
assert.match(behavior, /CAB_STICKY_HEADER_ATTR/);
assert.doesNotMatch(behavior, /\[class\*="sticky"\]/);

assert.match(orchestrator, /subscribeGestionaleViewport/);
assert.match(orchestrator, /waitForViewportStable/);
assert.match(orchestrator, /DEFAULT_STABLE_FRAMES/);

assert.match(behavior, /resolveScrollOwner/);
assert.match(behavior, /FocusVisibilityManager/);
assert.match(behavior, /syncFocusVisibilityCssVars/);
assert.match(behavior, /isMobileFocusVisibilityV2/);
assert.match(pipeline, /FocusTransactionStatus/);
assert.match(pipeline, /scheduleManagedFocusScroll/);
assert.match(flags, /NEXT_PUBLIC_MOBILE_FOCUS_VISIBILITY_V2/);
assert.match(debug, /__CAB_FOCUS_DEBUG_EVENTS/);
assert.match(orchestrator, /quietPeriod/);
assert.match(orchestrator, /DEFAULT_TIMEOUT_MS/);

assert.match(keyboardHook, /subscribeGestionaleViewport/);
assert.doesNotMatch(keyboardHook, /scrollGestionaleFieldIntoView/);
assert.doesNotMatch(keyboardHook, /scrollFocusedFieldInModal/);
assert.match(keyboardHook, /findModalScrollContainer/);
assert.match(keyboardHook, /CAB_MODAL_SCROLL_ATTR/);
assert.doesNotMatch(keyboardHook, /KEYBOARD_SETTLE_MS/);
assert.doesNotMatch(keyboardHook, /DEBOUNCE_MS/);

assert.match(modalFocus, /preventScroll: true/);
assert.match(formField, /CAB_FIELD_LABEL_ATTR/);

assert.match(iosStability, /mountGestionaleViewportOrchestrator/);
assert.match(iosStability, /handleFocusInForMobileModal/);
assert.doesNotMatch(iosStability, /visualViewport\?\.addEventListener/, "viewport listeners live in orchestrator");

assert.match(overlayBehavior, /useMobileModalKeyboard/);
assert.match(overlayBehavior, /useBodyScrollLock/);

assert.match(dropdownPortal, /getFloatingUiBoundaryPadding/);
assert.match(dropdownPortal, /computeKeyboardInset/);
assert.match(dropdownHook, /subscribeGestionaleViewport/);

assert.doesNotMatch(selectSrc, /scheduleGestionaleFieldScroll/);
assert.doesNotMatch(pillSrc, /scheduleGestionaleFieldScroll/);

assert.match(filterDrawer, /useGestionaleOverlayBehavior/);
assert.match(confirmDialog, /CAB_MODAL_ROOT_ATTR/);
assert.match(confirmDialog, /CAB_MODAL_SCROLL_ATTR/);
assert.match(confirmDialog, /useGestionaleOverlayBehavior/);

assert.match(textarea, /notifyFocusBlockLayoutChange|scrollGestionaleFieldIntoView/);
assert.match(textarea, /registerGestionaleTextareaViewportSync/);
assert.match(textarea, /shouldSkipRedundantGestionaleFocusScroll/);
assert.doesNotMatch(textarea, /subscribeGestionaleViewport/);
assert.doesNotMatch(textarea, /window\.addEventListener\("resize"/);

assert.match(textareaViewport, /registerGestionaleTextareaViewportSync/);
assert.match(textareaViewport, /subscribeGestionaleViewport/);

assert.match(settingsNavShell, /useGlobalDropdownPortal/);
assert.doesNotMatch(settingsNavShell, /absolute left-0 right-0 top-full/);

assert.doesNotMatch(schedeModal, /data-cab-ios-no-focus-scroll/);
assert.doesNotMatch(schedeModal, /absolute left-0 right-0 top-full/);
assert.match(schedaRicambiBody, /RicambioRowAutocompletePortal/);

assert.match(mezzoAc, /useGlobalDropdownPortal/);
assert.doesNotMatch(mezzoAc, /absolute left-0 right-0 top-full/);

assert.match(bottomSheet, /CAB_MODAL_ROOT_ATTR/);
assert.match(bottomSheet, /--cab-vv-height/);
assert.match(searchableSheet, /CAB_MODAL_SCROLL_ATTR/);
assert.match(searchableSheet, /cabModalScrollKeyboardPad/);

const lavorazioniModals = read("components/gestionale/lavorazioni/lavorazioni-modals.tsx");
assert.match(lavorazioniModals, /GestionaleModalScrollBody/);
assert.doesNotMatch(
  lavorazioniModals,
  /flex-1 space-y-4 overflow-y-auto overscroll-contain p-4/,
  "legacy inner scroll container removed",
);

console.log("mobile-focus-ssot-audit.test.ts OK");
