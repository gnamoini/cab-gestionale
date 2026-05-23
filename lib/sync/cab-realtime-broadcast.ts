"use client";

import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";

/** Invalidazione cache cross-tab quando Realtime non è connesso o per sync immediato. */

const CHANNEL_NAME = "cab-gestionale-sync-v1";
const TAB_ID_KEY = "cab-gestionale-tab-id";

export type GestionaleBroadcastMessage =
  | {
      type: "invalidate";
      tables: string[];
      sourceTabId: string;
      /** Entity id per tabella — soppressione eco post-mutazione cross-tab. */
      entityIdByTable?: Record<string, string>;
    }
  | { type: "cab_sync"; event: CabSyncEvent; sourceTabId: string };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

/** ID stabile per tab (sessionStorage) — evita eco broadcast. */
export function getGestionaleTabId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(TAB_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(TAB_ID_KEY, id);
    }
    return id;
  } catch {
    return `tab-${Date.now()}`;
  }
}

export function isForeignBroadcastSource(sourceTabId: string | undefined): boolean {
  if (!sourceTabId) return true;
  return sourceTabId !== getGestionaleTabId();
}

function postMessage(message: GestionaleBroadcastMessage): void {
  const ch = getChannel();
  if (!ch) return;
  try {
    ch.postMessage(message);
  } catch {
    /* ignore */
  }
}

export function broadcastGestionaleInvalidate(
  tables: string[],
  entityIdByTable?: ReadonlyMap<string, string> | Record<string, string>,
): void {
  const entityRecord =
    entityIdByTable instanceof Map
      ? Object.fromEntries(entityIdByTable)
      : entityIdByTable;
  postMessage({
    type: "invalidate",
    tables,
    sourceTabId: getGestionaleTabId(),
    ...(entityRecord && Object.keys(entityRecord).length > 0 ? { entityIdByTable: entityRecord } : {}),
  });
}

export function broadcastCabSyncEvent(event: CabSyncEvent): void {
  postMessage({ type: "cab_sync", event, sourceTabId: getGestionaleTabId() });
}

export type GestionaleBroadcastHandler = {
  onInvalidate: (
    tables: string[],
    sourceTabId: string,
    entityIdByTable?: ReadonlyMap<string, string>,
  ) => void;
  onCabSync?: (event: CabSyncEvent, sourceTabId: string) => void;
};

export function subscribeGestionaleBroadcast(handler: GestionaleBroadcastHandler): () => void {
  const ch = getChannel();
  if (!ch) return () => undefined;

  const listener = (ev: MessageEvent<GestionaleBroadcastMessage>) => {
    const data = ev.data;
    if (!data?.sourceTabId || !isForeignBroadcastSource(data.sourceTabId)) return;

    if (data.type === "invalidate" && Array.isArray(data.tables)) {
      const entityMap = data.entityIdByTable
        ? new Map(Object.entries(data.entityIdByTable))
        : undefined;
      handler.onInvalidate(data.tables, data.sourceTabId, entityMap);
      return;
    }
    if (data.type === "cab_sync" && data.event && handler.onCabSync) {
      handler.onCabSync(data.event, data.sourceTabId);
    }
  };
  ch.addEventListener("message", listener);
  return () => ch.removeEventListener("message", listener);
}

/** @deprecated Usare `subscribeGestionaleBroadcast`. */
export function subscribeGestionaleBroadcastLegacy(onInvalidate: (tables: string[]) => void): () => void {
  return subscribeGestionaleBroadcast({
    onInvalidate: (tables) => onInvalidate(tables),
  });
}
