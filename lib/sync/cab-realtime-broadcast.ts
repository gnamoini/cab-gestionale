"use client";

/** Invalidazione cache cross-tab quando Realtime non è connesso. */

const CHANNEL_NAME = "cab-gestionale-sync-v1";

type BroadcastMessage = { type: "invalidate"; tables: string[] };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function broadcastGestionaleInvalidate(tables: string[]): void {
  const ch = getChannel();
  if (!ch) return;
  try {
    ch.postMessage({ type: "invalidate", tables } satisfies BroadcastMessage);
  } catch {
    /* ignore */
  }
}

export function subscribeGestionaleBroadcast(onInvalidate: (tables: string[]) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => undefined;

  const handler = (ev: MessageEvent<BroadcastMessage>) => {
    if (ev.data?.type === "invalidate" && Array.isArray(ev.data.tables)) {
      onInvalidate(ev.data.tables);
    }
  };
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}
