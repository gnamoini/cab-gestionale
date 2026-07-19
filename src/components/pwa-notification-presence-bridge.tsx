"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

const HEARTBEAT_MS = 30_000;

function resolvePresence(): "ONLINE" | "BACKGROUND" {
  if (typeof document === "undefined") return "BACKGROUND";
  return document.visibilityState === "visible" ? "ONLINE" : "BACKGROUND";
}

/** Heartbeat presence → push_subscriptions.presence_status */
export function PwaNotificationPresenceBridge() {
  const endpointRef = useRef<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    async function touch() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        const endpoint = sub?.endpoint ?? null;
        if (!endpoint || cancelled) return;
        endpointRef.current = endpoint;
        const client = await getBrowserSupabase();
        await client.rpc("cab_touch_push_presence", {
          p_endpoint: endpoint,
          p_presence_status: resolvePresence(),
        });
      } catch {
        /* best-effort */
      }
    }

    void touch();
    const id = window.setInterval(() => void touch(), HEARTBEAT_MS);
    const onVis = () => void touch();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
