import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const adapter = read("lib/schede/schede-sync-adapter.ts");
assert.match(adapter, /fetchSchedeBundleForLavorazione/);
assert.match(adapter, /fetchSchedeBundlesForLavorazioni/);
assert.match(adapter, /ensureSchedeBundlesInCache/);
assert.match(adapter, /fetchSchedeRowsByLavorazioneIdsAuthorized/);
assert.doesNotMatch(adapter, /schedeService\.getAll\(\)/);

const hook = read("src/hooks/use-schede-store-query.ts");
assert.match(hook, /lavorazioneIds/);
assert.match(hook, /ensureSchedeBundlesInCache/);
assert.doesNotMatch(hook, /fetchSchedeBundlesFromDb/);

const devHook = read("lib/observability/long-session-dev-hook.ts");
assert.match(devHook, /__cabLongSessionMetrics/);

const forcePoll = read("lib/realtime/gestionale-force-poll.ts");
assert.match(forcePoll, /NEXT_PUBLIC_GESTIONALE_FORCE_POLL/);

const coordinator = read("lib/ui/gestionale-visibility-coordinator.ts");
assert.match(coordinator, /registerGestionaleVisibilityHandler/);

const auth = read("context/auth-context.tsx");
assert.match(auth, /registerGestionaleVisibilityHandler/);
assert.doesNotMatch(auth, /scheduleVisibilityRefresh/);

const snapshot = read("src/hooks/use-gestionale-snapshot-recovery.ts");
assert.match(snapshot, /registerGestionaleVisibilityHandler/);
assert.doesNotMatch(snapshot, /addEventListener\("visibilitychange"/);

console.log("schede-lazy-fetch.test.ts OK");
