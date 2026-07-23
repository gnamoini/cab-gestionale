import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");

const designSystem = readFileSync(join(root, "lib/ui/design-system.ts"), "utf8");
const shellNavBlock = designSystem.slice(
  designSystem.indexOf("export const dsShellNavIconBtn"),
  designSystem.indexOf("export const dsPageHeaderIconBtn"),
);
assert.match(shellNavBlock, /focus:outline-none focus:ring-0/);
assert.match(shellNavBlock, /dsFocusRing/);
assert.doesNotMatch(shellNavBlock, /\$\{dsFocus\}/);

const modalFocus = readFileSync(join(root, "components/gestionale/gestionale-modal-focus.ts"), "utf8");
assert.match(modalFocus, /panel\.focus\(/);
assert.doesNotMatch(
  modalFocus.slice(modalFocus.indexOf("useEffect"), modalFocus.indexOf("function onKeyDown")),
  /querySelector/,
);

const closeBtn = readFileSync(join(root, "components/design-system/close-button.tsx"), "utf8");
assert.match(closeBtn, /blurShellNavAfterPointer/);

const backBtn = readFileSync(join(root, "components/design-system/shell-nav-icon-button.tsx"), "utf8");
assert.match(backBtn, /blurShellNavAfterPointer/);

console.log("shell-nav-button-focus-audit.test.ts OK");
