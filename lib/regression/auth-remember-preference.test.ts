import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  AUTH_PERSISTENT_COOKIE_MAX_AGE,
  applyRememberToCookiesToSet,
  isSupabaseAuthCookieName,
  resolveAuthCookieOptions,
} from "@/lib/auth/auth-cookie-options";
import {
  CAB_AUTH_REMEMBER_COOKIE_KEY,
  readAuthRememberPreferenceFromCookies,
} from "@/lib/auth/auth-remember-preference";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const authCtx = read("context/auth-context.tsx");
const loginForm = read("app/login/login-form.tsx");
const browserClient = read("src/lib/supabase/browser-client.ts");
const middlewareClient = read("src/lib/supabase/middleware-client.ts");
const serverUserClient = read("src/lib/supabase/server-user-client.ts");

assert.doesNotMatch(authCtx, /_remember/);
assert.match(authCtx, /setAuthRememberPreference\(remember\)/);
assert.match(loginForm, /readAuthRememberPreference/);

assert.match(browserClient, /applyRememberToCookiesToSet/);
assert.match(browserClient, /readAuthRememberPreference/);
assert.match(middlewareClient, /applyRememberToCookiesToSet/);
assert.match(middlewareClient, /readAuthRememberPreferenceFromCookies/);
assert.match(serverUserClient, /applyRememberToCookiesToSet/);
assert.match(serverUserClient, /readAuthRememberPreferenceFromCookies/);

assert.equal(isSupabaseAuthCookieName("sb-test-auth-token"), true);
assert.equal(isSupabaseAuthCookieName("cab-theme"), false);

const baseOptions = { path: "/", sameSite: "lax" as const, httpOnly: false, maxAge: 123 };
const persistent = resolveAuthCookieOptions(baseOptions, true);
assert.equal(persistent?.maxAge, 123);
assert.equal(persistent?.expires, undefined);

const defaultPersistent = resolveAuthCookieOptions({ path: "/" }, true);
assert.equal(defaultPersistent?.maxAge, AUTH_PERSISTENT_COOKIE_MAX_AGE);

const session = resolveAuthCookieOptions(baseOptions, false);
assert.equal(session?.maxAge, undefined);
assert.equal(session?.expires, undefined);
assert.equal(session?.path, "/");

const deletion = resolveAuthCookieOptions({ ...baseOptions, maxAge: 0 }, false);
assert.equal(deletion?.maxAge, 0);

const mapped = applyRememberToCookiesToSet(
  [
    { name: "sb-local-auth-token", value: "x", options: baseOptions },
    { name: CAB_AUTH_REMEMBER_COOKIE_KEY, value: "1", options: baseOptions },
  ],
  false,
);
assert.equal(mapped[0]?.options?.maxAge, undefined);
assert.equal(mapped[1]?.options?.maxAge, 123);

assert.equal(readAuthRememberPreferenceFromCookies([]), true);
assert.equal(
  readAuthRememberPreferenceFromCookies([{ name: CAB_AUTH_REMEMBER_COOKIE_KEY, value: "0" }]),
  false,
);
assert.equal(
  readAuthRememberPreferenceFromCookies([{ name: CAB_AUTH_REMEMBER_COOKIE_KEY, value: "1" }]),
  true,
);

console.log("auth-remember-preference.test.ts OK");
