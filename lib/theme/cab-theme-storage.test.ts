import assert from "node:assert/strict";
import {
  DEFAULT_PERSISTED_THEME_MODE,
  type PersistedThemeMode,
} from "@/lib/theme/user-theme-prefs";
import {
  resolveServerThemeMode,
  syncBrowserChromeThemeColor,
  THEME_CRITICAL_BG,
} from "@/lib/theme/cab-theme-storage";

assert.equal(DEFAULT_PERSISTED_THEME_MODE, "dark");

assert.equal(resolveServerThemeMode("dark"), "dark");
assert.equal(resolveServerThemeMode("light"), "light");
assert.equal(resolveServerThemeMode(undefined), "dark");
assert.equal(resolveServerThemeMode(null), "dark");
assert.equal(resolveServerThemeMode("invalid"), "dark");

const modes: PersistedThemeMode[] = ["dark", "light"];
for (const mode of modes) {
  assert.ok(THEME_CRITICAL_BG[mode].startsWith("#"), `THEME_CRITICAL_BG.${mode} must be hex`);
}

assert.equal(typeof syncBrowserChromeThemeColor, "function");

console.log("cab-theme-storage.test.ts OK");
