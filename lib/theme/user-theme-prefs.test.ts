import assert from "node:assert/strict";
import { parsePersistedThemeMode, themeModeFromSettingsValue } from "@/lib/theme/user-theme-prefs";

assert.equal(parsePersistedThemeMode("light"), "light");
assert.equal(parsePersistedThemeMode("dark"), "dark");
assert.equal(parsePersistedThemeMode("system"), null);
assert.equal(themeModeFromSettingsValue({ theme: "dark" }), "dark");
assert.equal(themeModeFromSettingsValue({}), null);

console.log("user-theme-prefs.test.ts OK");
