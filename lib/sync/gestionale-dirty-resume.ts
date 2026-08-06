"use client";

import { clearStaleVerifiedDirtyEntries } from "@/lib/sync/gestionale-dirty-state";
import {
  checkRemoteRevisions,
  markDirtyFromVerifiedDrift,
} from "@/lib/sync/check-remote-revisions";
import { isOperationalSessionWarmingUp } from "@/lib/sync/operational-session-warmup";
import { isGestionaleDirtySyncEnabled } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { logGestionaleSyncPipelineStage } from "@/lib/sync/gestionale-sync-pipeline-trace";

/** Version check al resume — dirty solo dopo conferma server. */
export async function recoverGestionaleDirtyOnResume(): Promise<void> {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  if (!isGestionaleDirtySyncEnabled()) return;
  if (isOperationalSessionWarmingUp()) return;

  logGestionaleSyncPipelineStage("resume_check");

  let result;
  try {
    result = await checkRemoteRevisions({ reason: "resume" });
  } catch {
    return;
  }

  if (result.changedTables.length === 0) {
    clearStaleVerifiedDirtyEntries({
      serverVersions: result.serverVersions,
      changedTables: result.changedTables,
    });
    return;
  }

  logGestionaleSyncPipelineStage("resume_drift", { tables: result.changedTables });
  markDirtyFromVerifiedDrift(result.changedTables, result.serverVersions);
}
