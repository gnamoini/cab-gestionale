"use client";

import { memo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAuthSessionEstablished, useAuth } from "@/context/auth-context";
import { runPwaSyncFinalization } from "@/lib/pwa/pwa-sync-finalization";

/** Resume mobile / BFCache — nessun sync continuo. */
export const PwaSyncFinalizationBridge = memo(function PwaSyncFinalizationBridge() {
  const { status } = useAuth();
  const authReady = isAuthSessionEstablished(status);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authReady) return;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      runPwaSyncFinalization(queryClient);
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      runPwaSyncFinalization(queryClient);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [authReady, queryClient]);

  return null;
});
