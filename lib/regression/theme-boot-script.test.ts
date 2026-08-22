/**
 * Theme boot: RootLayout usa style critico + script inline blocking in <head> (React 19 / Next 16).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const layout = read("app/layout.tsx");
const globalError = read("app/global-error.tsx");
const themeBoot = read("lib/theme/theme-boot-inline-script.ts");

assert.match(layout, /from "next\/headers"/);
assert.match(layout, /resolveServerThemeMode/);
assert.match(layout, /CAB_THEME_CRITICAL_INLINE_STYLE/);
assert.match(layout, /cab-theme-critical/);
assert.match(layout, /id="cab-theme-boot"/);
assert.match(layout, /CAB_THEME_BOOT_INLINE_SCRIPT/);
assert.match(layout, /serverTheme === "dark" \? " dark" : ""/);
assert.match(layout, /<script[\s\S]*id="cab-theme-boot"/);
assert.doesNotMatch(layout, /from "next\/script"/);
assert.doesNotMatch(layout, /strategy="beforeInteractive"/);
assert.match(layout, /id="cab-app-boot-msg"[\s\S]*suppressHydrationWarning/);

assert.match(globalError, /CAB_THEME_CRITICAL_INLINE_STYLE/);
assert.doesNotMatch(globalError, /from "next\/script"/);
assert.doesNotMatch(globalError, /cab-theme-boot/);

assert.match(themeBoot, /export const CAB_THEME_CRITICAL_INLINE_STYLE/);
assert.match(themeBoot, /export const CAB_THEME_BOOT_INLINE_SCRIPT/);
assert.ok(themeBoot.includes("localStorage"), "theme boot script must read localStorage");
assert.ok(themeBoot.includes("document.cookie"), "theme boot script must sync cookie");

console.log("theme-boot-script.test.ts OK");
