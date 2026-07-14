"use client";

import { useEffect, useRef } from "react";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import {
  registerPwaOfflineWriteNotifier,
  readPwaConnectivityState,
  subscribePwaConnectivity,
} from "@/lib/pwa/pwa-connectivity";

export function PwaNetworkNotice() {
  const gestToast = useGestionaleToast();
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    registerPwaOfflineWriteNotifier((message) => gestToast.warning(message));
    return () => registerPwaOfflineWriteNotifier(null);
  }, [gestToast]);

  useEffect(() => {
    const sync = () => {
      const offline = !readPwaConnectivityState().online;
      if (offline && !wasOfflineRef.current) {
        gestToast.warning("Connessione assente. Alcune funzioni potrebbero non essere disponibili.");
      }
      if (!offline && wasOfflineRef.current) {
        gestToast.info("Connessione ripristinata.");
      }
      wasOfflineRef.current = offline;
    };

    sync();
    return subscribePwaConnectivity(sync);
  }, [gestToast]);

  return null;
}
