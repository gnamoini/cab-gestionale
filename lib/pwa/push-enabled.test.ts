import assert from "node:assert/strict";
import {
  resolvePwaPushClientEnabled,
  resolvePwaPushFlagExplicit,
  resolvePwaPushServerEnabled,
} from "@/lib/pwa/push-enabled";
import {
  isMobileBackgroundPushEligible,
  isMobileHandheldPlatform,
} from "@/lib/pwa/pwa-mobile";
import { shouldPreferPwaPushOverDesktopPrompt } from "@/lib/pwa/push-permission-flow";

assert.equal(resolvePwaPushFlagExplicit(), null);

const saved = { ...process.env };
try {
  process.env.PWA_PUSH_ENABLED = "false";
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  assert.equal(resolvePwaPushClientEnabled(), false);
  assert.equal(resolvePwaPushServerEnabled(false), false);
  assert.equal(resolvePwaPushServerEnabled(true), false);

  process.env.PWA_PUSH_ENABLED = "";
  assert.equal(resolvePwaPushClientEnabled(), false);
  assert.equal(resolvePwaPushServerEnabled(false), false);

  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
  assert.equal(resolvePwaPushClientEnabled(), true);
  assert.equal(resolvePwaPushServerEnabled(true), true);
  assert.equal(resolvePwaPushServerEnabled(false), false);

  process.env.PWA_PUSH_ENABLED = "false";
  assert.equal(resolvePwaPushClientEnabled(), false);
  assert.equal(resolvePwaPushServerEnabled(true), false);

  process.env.PWA_PUSH_ENABLED = "true";
  assert.equal(resolvePwaPushClientEnabled(), true);
  assert.equal(resolvePwaPushServerEnabled(false), true);
} finally {
  process.env.PWA_PUSH_ENABLED = saved.PWA_PUSH_ENABLED;
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = saved.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

assert.equal(isMobileHandheldPlatform({ userAgent: "Mozilla/5.0 (iPhone)", maxTouchPoints: 5 }), true);
assert.equal(isMobileHandheldPlatform({ userAgent: "Mozilla/5.0 (Windows NT 10.0)", maxTouchPoints: 0 }), false);

assert.equal(
  isMobileBackgroundPushEligible({
    userAgent: "Mozilla/5.0 (Linux; Android 14) Mobile Chrome",
    maxTouchPoints: 5,
    matchMedia: () => ({ matches: false }),
    navigatorStandalone: false,
  }),
  true,
);

assert.equal(
  isMobileBackgroundPushEligible({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    maxTouchPoints: 5,
    matchMedia: () => ({ matches: false }),
    navigatorStandalone: false,
  }),
  false,
);

assert.equal(
  isMobileBackgroundPushEligible({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    maxTouchPoints: 5,
    matchMedia: (q) => ({ matches: q.includes("standalone") }),
    navigatorStandalone: true,
  }),
  true,
);

// shouldPreferPwaPushOverDesktopPrompt follows PWA_PUSH_ENABLED at module load — smoke import only
assert.equal(typeof shouldPreferPwaPushOverDesktopPrompt(), "boolean");

console.log("push-enabled.test.ts OK");
