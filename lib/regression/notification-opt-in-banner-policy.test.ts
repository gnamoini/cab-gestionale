import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const notificationBanner = fs.readFileSync(
  path.join(ROOT, "src/components/notification-opt-in-banner.tsx"),
  "utf8",
);
const devPreview = fs.readFileSync(
  path.join(ROOT, "components/gestionale/dev-system-banners-preview-mount.tsx"),
  "utf8",
);

assert.doesNotMatch(notificationBanner, /\btags=/);
assert.doesNotMatch(notificationBanner, /NOTIFICATION_OPT_IN_BENEFITS/);

const previewFnStart = devPreview.indexOf("function PreviewNotificationOptIn");
const previewFnEnd = devPreview.indexOf("function PreviewPwaInstall");
assert.ok(previewFnStart >= 0 && previewFnEnd > previewFnStart);
const previewFn = devPreview.slice(previewFnStart, previewFnEnd);
assert.doesNotMatch(previewFn, /\btags=/);
assert.doesNotMatch(previewFn, /Tipi di avviso/);

console.log("notification-opt-in-banner-policy.test.ts OK");
