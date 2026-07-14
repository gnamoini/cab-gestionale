"use client";

import { memo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  PWA_RECONNECT_DEBOUNCE_MS,
  runPwaReconnectSync,
} from "@/lib/pwa/pwa-reconnect-sync";

/** Solo trigger coordinator — logica dati in runPwaReconnectSync / layer sync esistenti. */
export const PwaReconnectBridge = memo(function PwaReconnectBridge() {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let debounceId: ReturnType<typeof setTimeout> | undefined;

    const onOnline = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        runPwaReconnectSync(qc);
      }, PWA_RECONNECT_DEBOUNCE_MS);
    };

    window.addEventListener("online", onOnline);
    return () => {
      if (debounceId) clearTimeout(debounceId);
      window.removeEventListener("online", onOnline);
    };
  }, [qc]);

  return null;
});
