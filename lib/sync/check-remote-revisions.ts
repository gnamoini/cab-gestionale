"use client";

import { markGestionaleDirty } from "@/lib/sync/gestionale-dirty-state";
import { shouldSkipOperationalDirtyMark } from "@/lib/sync/operational-dirty-mark-gate";
import { isDirtySyncEnabledForDomain } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { getActiveSyncContexts } from "@/lib/sync/gestionale-sync-scope";
import {
  type OperationalTableVersions,
  consumeOperationalVersionPoll,
  getOperationalVersionBaseline,
} from "@/lib/sync/operational-data-version";
import {
  TABLE_TO_SYNC_DOMAIN,
  type GestionaleSyncDomain,
} from "@/lib/sync/gestionale-sync-scope";
import { logOperationalResumeCheck } from "@/lib/sync/operational-resume-observability";

export type RemoteRevisionCheckReason = "resume" | "poll" | "reconnect" | "offline_online";

export type RemoteRevisionCheckResult = {
  changedTables: string[];
  changedDomains: GestionaleSyncDomain[];
  serverVersions: OperationalTableVersions;
  previousVersions: OperationalTableVersions | null;
  durationMs: number;
};

let checkRemoteRevisionsPromise: Promise<RemoteRevisionCheckResult> | null = null;

function resolveChangedDomains(tables: readonly string[]): GestionaleSyncDomain[] {
  const domains = new Set<GestionaleSyncDomain>();
  for (const table of tables) {
    const domain = TABLE_TO_SYNC_DOMAIN[table];
    if (domain) domains.add(domain);
  }
  return [...domains];
}

async function runRemoteRevisionCheck(
  reason: RemoteRevisionCheckReason,
): Promise<RemoteRevisionCheckResult> {
  const startedAt = Date.now();
  const previousVersions = getOperationalVersionBaseline();
  const changedTables = await consumeOperationalVersionPoll({ detectDrift: true });
  const serverVersions = getOperationalVersionBaseline() ?? {};
  const changedDomains = resolveChangedDomains(changedTables);
  const durationMs = Date.now() - startedAt;

  logOperationalResumeCheck({
    reason,
    previousVersions,
    serverVersions,
    changedTables,
    changedDomains,
    durationMs,
  });

  return {
    changedTables,
    changedDomains,
    serverVersions,
    previousVersions,
    durationMs,
  };
}

/** SSOT version check — single-flight sulla RPC. */
export function checkRemoteRevisions(opts?: {
  reason?: RemoteRevisionCheckReason;
}): Promise<RemoteRevisionCheckResult> {
  const reason = opts?.reason ?? "poll";
  if (checkRemoteRevisionsPromise) return checkRemoteRevisionsPromise;

  checkRemoteRevisionsPromise = runRemoteRevisionCheck(reason).finally(() => {
    checkRemoteRevisionsPromise = null;
  });
  return checkRemoteRevisionsPromise;
}

export function markDirtyFromVerifiedDrift(
  tables: readonly string[],
  serverVersions?: OperationalTableVersions,
): void {
  if (tables.length === 0) return;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

  const tableSet = new Set(tables);
  const scopes = getActiveSyncContexts();
  const now = Date.now();
  const versions = serverVersions ?? getOperationalVersionBaseline() ?? {};

  for (const scope of scopes) {
    if (!isDirtySyncEnabledForDomain(scope.domain)) continue;
    for (const table of scope.tables) {
      if (!tableSet.has(table)) continue;
      if (shouldSkipOperationalDirtyMark(table)) continue;
      const domain = TABLE_TO_SYNC_DOMAIN[table] ?? scope.domain;
      markGestionaleDirty({
        domain,
        table,
        entityId: null,
        type: "update",
        timestamp: now,
        source: "realtime",
        remoteVersion: versions[table],
      });
    }
  }
}

/** Test helper */
export function resetCheckRemoteRevisionsForTests(): void {
  checkRemoteRevisionsPromise = null;
}
