"use client";

import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import type { OperationalTableVersions } from "@/lib/sync/operational-data-version";
import type { GestionaleSyncDomain } from "@/lib/sync/gestionale-sync-scope";
import type { RemoteRevisionCheckReason } from "@/lib/sync/check-remote-revisions";

const PROD_SAMPLE_RATE = 0.05;

export type OperationalResumeCheckPayload = {
  reason: RemoteRevisionCheckReason;
  previousVersions: OperationalTableVersions | null;
  serverVersions: OperationalTableVersions;
  changedTables: string[];
  changedDomains: GestionaleSyncDomain[];
  durationMs: number;
};

function shouldLogOperationalResumeCheck(changedTables: readonly string[]): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (changedTables.length > 0) return true;
  return Math.random() < PROD_SAMPLE_RATE;
}

export function logOperationalResumeCheck(payload: OperationalResumeCheckPayload): void {
  if (!shouldLogOperationalResumeCheck(payload.changedTables)) return;

  const eventPayload = {
    reason: payload.reason,
    changedTables: payload.changedTables,
    changedDomains: payload.changedDomains,
    durationMs: payload.durationMs,
    previousRevisionSummary: payload.previousVersions,
    serverRevisionSummary: payload.serverVersions,
  };

  if (process.env.NODE_ENV === "development") {
    console.debug("[operational_resume_check]", eventPayload);
  }

  trackRuntimeEvent(RuntimeEvents.operationalResumeCheck, eventPayload);
}
