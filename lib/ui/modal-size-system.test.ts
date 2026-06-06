import assert from "node:assert/strict";
import {
  defaultModalHeightForSize,
  resolveDrawerAsideClasses,
  resolveModalWidthClasses,
  resolveShellModalLayout,
} from "@/lib/ui/modal-size-system";

assert.match(resolveModalWidthClasses("confirmation"), /28rem/);
assert.match(resolveModalWidthClasses("formMedium"), /cab-modal-min-w-form-medium/);
assert.match(resolveModalWidthClasses("formLarge"), /cab-modal-min-w-form-large/);
assert.match(resolveModalWidthClasses("analytics"), /cab-modal-min-w-analytics/);

assert.equal(defaultModalHeightForSize("formSmall"), "compact");
assert.equal(defaultModalHeightForSize("formLarge"), "standard");

const compactLayout = resolveShellModalLayout({ modalSize: "formSmall" });
assert.match(compactLayout.surfaceClass, /72dvh|560px/);

const legacyHub = resolveShellModalLayout({ legacyDialogSize: "hub" });
assert.match(legacyHub.widthClass, /cab-modal-min-w-form-medium/);
assert.match(legacyHub.surfaceClass, /840px/);

assert.match(resolveDrawerAsideClasses("drawerLog"), /drawer-log|28rem/);
assert.match(resolveDrawerAsideClasses("drawerFilter"), /22rem/);
assert.match(resolveDrawerAsideClasses("drawerNav"), /19\.5rem/);

console.log("modal-size-system.test.ts OK");
