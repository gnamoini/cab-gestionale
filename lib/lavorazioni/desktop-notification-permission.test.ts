import assert from "node:assert/strict";
import {
  formatDesktopNotificationPermissionStatusLabel,
  resolveDesktopNotificationPermissionState,
  shouldShowDesktopNotificationPermissionBanner,
} from "@/lib/lavorazioni/desktop-notification-permission";

assert.equal(resolveDesktopNotificationPermissionState(false, undefined), "unsupported");
assert.equal(resolveDesktopNotificationPermissionState(true, "granted"), "granted");
assert.equal(resolveDesktopNotificationPermissionState(true, "denied"), "denied");
assert.equal(resolveDesktopNotificationPermissionState(true, "default"), "default");

assert.equal(formatDesktopNotificationPermissionStatusLabel("granted"), "attive");
assert.equal(formatDesktopNotificationPermissionStatusLabel("denied"), "non autorizzate");
assert.equal(formatDesktopNotificationPermissionStatusLabel("default"), "non attive");
assert.equal(formatDesktopNotificationPermissionStatusLabel("unsupported"), "non supportate");

assert.equal(shouldShowDesktopNotificationPermissionBanner("default", false), true);
assert.equal(shouldShowDesktopNotificationPermissionBanner("default", true), false);
assert.equal(shouldShowDesktopNotificationPermissionBanner("granted", false), false);
assert.equal(shouldShowDesktopNotificationPermissionBanner("denied", false), false);

console.log("desktop-notification-permission.test.ts OK");
