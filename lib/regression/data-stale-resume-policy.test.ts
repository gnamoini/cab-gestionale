/**
 * Policy: resume version check separato da transport reconnect.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const realtimeBridge = read("src/components/gestionale-realtime-bridge.tsx");
assert.doesNotMatch(realtimeBridge, /recoverGestionaleDirtyOnResume/);
assert.match(realtimeBridge, /realignOperationalVersionBaseline/);
assert.doesNotMatch(realtimeBridge, /resetOperationalVersionBaseline/);

const resumeBridge = read("src/components/gestionale-resume-bridge.tsx");
assert.match(resumeBridge, /registerGestionaleResumeHandler/);
assert.match(resumeBridge, /recoverGestionaleDirtyOnResume/);

const resumeCoordinator = read("lib/sync/gestionale-resume-coordinator.ts");
assert.match(resumeCoordinator, /GESTIONALE_RESUME_COORDINATOR_DEBOUNCE_MS/);

const checkRevisions = read("lib/sync/check-remote-revisions.ts");
assert.match(checkRevisions, /checkRemoteRevisionsPromise/);

const dirtyResume = read("lib/sync/gestionale-dirty-resume.ts");
assert.doesNotMatch(dirtyResume, /hydrateGestionaleDirtyFromSession/);
assert.match(dirtyResume, /clearStaleVerifiedDirtyEntries/);

const syncFinal = read("lib/pwa/pwa-sync-finalization.ts");
assert.doesNotMatch(syncFinal, /runPwaReconnectSync/);

console.log("data-stale-resume-policy.test.ts OK");
