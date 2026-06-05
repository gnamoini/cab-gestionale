import assert from "node:assert/strict";
import {
  pilotIncoherenceExplanation,
  resolvePilotSettingsState,
} from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";

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
  const disabled = resolvePilotSettingsState(false);
  assert.equal(disabled.state, "disabled");
  assert.equal(disabled.incoherent, false);
  assert.equal(pilotIncoherenceExplanation(disabled), null);

  const dbOnly = resolvePilotSettingsState(true);
  assert.equal(dbOnly.state, "db_only");
  assert.equal(dbOnly.effectiveEnabled, false);
  assert.equal(dbOnly.incoherent, false);
  assert.equal(pilotIncoherenceExplanation(dbOnly), null);
});

withEnv("1", () => {
  const complete = resolvePilotSettingsState(true);
  assert.equal(complete.state, "complete");
  assert.equal(complete.effectiveEnabled, true);
  assert.equal(complete.incoherent, false);
  assert.equal(pilotIncoherenceExplanation(complete), null);

  const uiOnly = resolvePilotSettingsState(false);
  assert.equal(uiOnly.state, "ui_only");
  assert.equal(uiOnly.effectiveEnabled, false);
  assert.equal(uiOnly.incoherent, true);
  assert.equal(
    pilotIncoherenceExplanation(uiOnly),
    "INCOERENTE (risk mode): UI (env) ON, DB (app_settings) OFF. Il pilot non è allineato su RLS.",
  );
});

console.log("resolve-pilot-settings-state.test.ts OK");
