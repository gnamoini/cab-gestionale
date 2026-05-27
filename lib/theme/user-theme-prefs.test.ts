import assert from "node:assert/strict";
import {
  DEFAULT_PERSISTED_THEME_MODE,
  parsePersistedThemeMode,
  themeModeFromSettingsValue,
} from "@/lib/theme/user-theme-prefs";

assert.equal(DEFAULT_PERSISTED_THEME_MODE, "dark");

assert.equal(parsePersistedThemeMode("light"), "light");
assert.equal(parsePersistedThemeMode("dark"), "dark");
assert.equal(parsePersistedThemeMode("system"), null);
assert.equal(themeModeFromSettingsValue({ theme: "dark" }), "dark");
assert.equal(themeModeFromSettingsValue({}), null);

console.log("user-theme-prefs.test.ts OK");
