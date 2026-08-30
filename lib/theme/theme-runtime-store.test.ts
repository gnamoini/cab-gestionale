import assert from "node:assert/strict";
import {
  getThemeRuntimeState,
  patchThemeRuntimeState,
} from "@/lib/theme/theme-runtime-store";

patchThemeRuntimeState({ resolved: "light", themeReady: true, themeSaving: false });
assert.equal(getThemeRuntimeState().resolved, "light");

patchThemeRuntimeState({ resolved: "light" });
assert.equal(getThemeRuntimeState().resolved, "light");

patchThemeRuntimeState({ resolved: "dark" });
assert.equal(getThemeRuntimeState().resolved, "dark");

patchThemeRuntimeState({ themeSaving: true });
assert.equal(getThemeRuntimeState().themeSaving, true);

console.log("theme-runtime-store.test.ts OK");
