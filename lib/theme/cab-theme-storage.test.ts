import assert from "node:assert/strict";
import { DEFAULT_PERSISTED_THEME_MODE } from "@/lib/theme/user-theme-prefs";

assert.equal(DEFAULT_PERSISTED_THEME_MODE, "dark");

console.log("cab-theme-storage.test.ts OK");
