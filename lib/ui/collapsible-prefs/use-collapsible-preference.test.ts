import assert from "node:assert/strict";
import { collapsibleExpandedBoolPref } from "@/lib/ui/collapsible-prefs/presets";

assert.equal(collapsibleExpandedBoolPref(false, { scope: "test", key: "k", userId: "u1" }).defaultValue, false);
assert.equal(
  collapsibleExpandedBoolPref(false, { scope: "test", key: "k", userId: "u1", persist: false }).persist,
  false,
);

console.log("use-collapsible-preference.test.ts OK (presets smoke)");
