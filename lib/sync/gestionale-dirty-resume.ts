"use client";

import type { QueryClient } from "@tanstack/react-query";
import { markDirtyForOperationalTables } from "@/lib/sync/gestionale-dirty-flush";
import { hydrateGestionaleDirtyFromSession } from "@/lib/sync/gestionale-dirty-state";
import { consumeOperationalVersionPoll } from "@/lib/sync/operational-data-version";
import { isOperationalSessionWarmingUp } from "@/lib/sync/operational-session-warmup";
import { refetchActiveOperationalSnapshot } from "@/lib/sync/gestionale-snapshot-recovery";
import { isGestionaleDirtySyncEnabled } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { logGestionaleSyncPipelineStage } from "@/lib/sync/gestionale-sync-pipeline-trace";

/** Ripristina dirty dopo resume tab (visibility) — drift version + sessionStorage. */
export async function recoverGestionaleDirtyOnResume(qc: QueryClient): Promise<void> {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  if (!isGestionaleDirtySyncEnabled()) return;
  if (isOperationalSessionWarmingUp()) return;

  logGestionaleSyncPipelineStage("resume_check");

  hydrateGestionaleDirtyFromSession();

  let drifted: string[] = [];
  try {
    drifted = await consumeOperationalVersionPoll();
  } catch {
    return;
  }

  if (drifted.length === 0) return;

  logGestionaleSyncPipelineStage("resume_drift", { tables: drifted });
  markDirtyForOperationalTables(drifted);

  if (!isGestionaleDirtySyncEnabled()) {
    refetchActiveOperationalSnapshot(qc, { onlyActive: true });
  }
}
