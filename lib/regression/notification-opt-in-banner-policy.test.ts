import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const notificationBanner = fs.readFileSync(
  path.join(ROOT, "src/components/notification-opt-in-banner.tsx"),
  "utf8",
);

assert.doesNotMatch(notificationBanner, /\btags=/);
assert.doesNotMatch(notificationBanner, /NOTIFICATION_OPT_IN_BENEFITS/);

console.log("notification-opt-in-banner-policy.test.ts OK");
