/**
 * Theme boot: RootLayout usa next/script beforeInteractive, non raw <script> (React 19).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const layout = read("app/layout.tsx");
const themeBoot = read("lib/theme/theme-boot-inline-script.ts");

assert.doesNotMatch(layout, /<script[\s/>]/);
assert.match(layout, /from "next\/script"/);
assert.match(layout, /strategy="beforeInteractive"/);
assert.match(layout, /<head[\s\S]*cab-theme-boot[\s\S]*<\/head>/);
assert.match(layout, /id="cab-theme-boot"/);
assert.match(layout, /CAB_THEME_BOOT_INLINE_SCRIPT/);

assert.match(themeBoot, /export const CAB_THEME_BOOT_INLINE_SCRIPT/);
assert.ok(themeBoot.includes("localStorage"), "theme boot script must read localStorage");

console.log("theme-boot-script.test.ts OK");
