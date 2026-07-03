import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TkbChangeHint } from "../types";
import { loadTkbDraftStore, markTkbDraftStaleDb, saveTkbDraftStore } from "../tkb-repository.server";

const pending: TkbChangeHint[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing: Promise<void> | null = null;

const DEBOUNCE_MS = 30_000;

const TKB_SYNC_TABLES = new Set([
  "lavorazioni",
  "scheda_lavorazione",
  "magazzino_ricambi",
  "preventivi",
  "attrezzature",
  "mezzi",
  "app_settings",
]);

export function isTkbSyncTable(table: string): boolean {
  return TKB_SYNC_TABLES.has(table);
}

export function enqueueTkbSyncEvent(event: TkbChangeHint): void {
  const key = `${event.entityType}:${event.entityId}`;
  const idx = pending.findIndex((e) => `${e.entityType}:${e.entityId}` === key);
  if (idx >= 0) pending[idx] = event;
  else pending.push(event);
}

export function scheduleTkbSyncFlush(supabase: SupabaseClient): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushTkbSyncQueue(supabase);
  }, DEBOUNCE_MS);
}

export async function flushTkbSyncQueue(supabase: SupabaseClient): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const hints = [...pending];
    pending.length = 0;
    const store = await loadTkbDraftStore(supabase);
    const mergedHints = [
      ...((store?.pending_events as TkbChangeHint[]) ?? []),
      ...hints,
    ];
    if (!mergedHints.length && store && !store.stale) return;

    const { buildTkbDraft } = await import("../ingestion/builder");
    await import("../ingestion/register-sources");

    const mode = mergedHints.length ? "incremental" : "full";
    const bundle = await buildTkbDraft(supabase, {
      mode,
      hints: mergedHints,
      previousDraft: store?.draft_json,
    });
    await saveTkbDraftStore(supabase, bundle, {
      stale: false,
      pendingEvents: [],
      buildMode: mode,
    });
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export async function enqueueAndScheduleTkbSync(
  supabase: SupabaseClient,
  events: TkbChangeHint[],
): Promise<void> {
  for (const e of events) enqueueTkbSyncEvent(e);
  await markTkbDraftStaleDb(supabase, [...pending]);
  scheduleTkbSyncFlush(supabase);
}
