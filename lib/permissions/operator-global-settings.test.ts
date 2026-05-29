import assert from "node:assert/strict";
import {
  isOperatorGlobalSettingsEnabled,
  isOperatorGlobalSettingsEnvEnabled,
  parseOperatorGlobalSettingsDbEnabled,
  readOperatorGlobalSettingsDbEnabledFromRows,
} from "@/lib/permissions/operator-global-settings";

const prev = process.env.NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS;

function withEnv(v: string | undefined, fn: () => void) {
  if (v === undefined) delete process.env.NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS;
  else process.env.NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS = v;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS;
    else process.env.NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS = prev;
  }
}

withEnv(undefined, () => {
  assert.equal(isOperatorGlobalSettingsEnvEnabled(), false);
  assert.equal(isOperatorGlobalSettingsEnabled(true), false);
});

withEnv("1", () => {
  assert.equal(isOperatorGlobalSettingsEnvEnabled(), true);
  assert.equal(isOperatorGlobalSettingsEnabled(false), false);
  assert.equal(isOperatorGlobalSettingsEnabled(true), true);
});

withEnv("true", () => {
  assert.equal(isOperatorGlobalSettingsEnvEnabled(), false);
});

assert.equal(parseOperatorGlobalSettingsDbEnabled(null), false);
assert.equal(parseOperatorGlobalSettingsDbEnabled({ enabled: true }), true);
assert.equal(parseOperatorGlobalSettingsDbEnabled({ enabled: false }), false);

assert.equal(
  readOperatorGlobalSettingsDbEnabledFromRows([
    { module: "system", key: "enable_operator_global_settings", value: { enabled: true } },
  ]),
  true,
);

console.log("operator-global-settings.test.ts OK");
