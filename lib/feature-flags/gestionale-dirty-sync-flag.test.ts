import assert from "node:assert/strict";
import {
  resolveGestionaleDirtySyncMode,
  setGestionaleDirtySyncModeRuntime,
  isDirtySyncEnabledForDomain,
} from "@/lib/feature-flags/gestionale-dirty-sync-flag";

const prev = process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC;
try {
  delete process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC;
  assert.equal(resolveGestionaleDirtySyncMode(null), "pilot_heavy");

  process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC = "pilot_lavorazioni";
  setGestionaleDirtySyncModeRuntime(resolveGestionaleDirtySyncMode());
  assert.equal(isDirtySyncEnabledForDomain("lavorazioni"), true);
  assert.equal(isDirtySyncEnabledForDomain("dashboard"), false);

  process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC = "pilot_heavy";
  setGestionaleDirtySyncModeRuntime(resolveGestionaleDirtySyncMode());
  assert.equal(isDirtySyncEnabledForDomain("dashboard"), true);
  assert.equal(isDirtySyncEnabledForDomain("sicurezza"), false);
} finally {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC;
  else process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC = prev;
  setGestionaleDirtySyncModeRuntime(resolveGestionaleDirtySyncMode());
}

console.log("gestionale-dirty-sync-flag.test.ts OK");
