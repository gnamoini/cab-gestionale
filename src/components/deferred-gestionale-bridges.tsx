"use client";

import { useEffect, useState } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { GestionaleNotificationsBridge } from "@/src/components/gestionale-notifications-bridge";
import { GestionaleRealtimeBridge } from "@/src/components/gestionale-realtime-bridge";
import { GestionaleSnapshotRecoveryBridge } from "@/src/components/gestionale-snapshot-recovery-bridge";

/**
 * Monta i bridge realtime/notifiche solo dopo sessione stabile e primo frame,
 * per ridurre churn hook nel bootstrap pre-auth.
 */
export function DeferredGestionaleBridges() {
  const { status, user } = useAuth();
  const authReady = isAuthSessionEstablished(status) && !!user?.id;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!authReady) {
      setMounted(false);
      return;
    }
    const id = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(id);
      setMounted(false);
    };
  }, [authReady]);

  if (!mounted) return null;

  return (
    <>
      <GestionaleRealtimeBridge />
      <GestionaleNotificationsBridge />
      <GestionaleSnapshotRecoveryBridge />
    </>
  );
}
