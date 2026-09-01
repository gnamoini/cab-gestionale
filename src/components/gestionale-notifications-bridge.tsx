"use client";

import { useEffect, useRef } from "react";
import { useToastContext } from "@/context/toast-context";
import { useStaffInboxEligibleRpc } from "@/src/hooks/gestionale/use-inbox-eligible";
import { subscribeNotificheGestionale } from "@/lib/sync/gestionale-notification-dispatch";

/**
 * Bridge unico notifiche operative -> toast UI.
 * Staff inbox eligibility via DB RPC (allineato ai bridge dominio).
 */
export function GestionaleNotificationsBridge() {
  const { push } = useToastContext();
  const { eligible: canViewOperationalNotifications, isLoading } = useStaffInboxEligibleRpc();
  const recentRef = useRef<Map<string, number>>(new Map());
  const VIEW_DEDUP_MS = 2500;

  useEffect(() => {
    if (isLoading || !canViewOperationalNotifications) return;
    return subscribeNotificheGestionale((notification) => {
      const now = Date.now();
      for (const [k, ts] of recentRef.current) {
        if (now - ts > VIEW_DEDUP_MS) recentRef.current.delete(k);
      }
      if (recentRef.current.has(notification.fingerprint)) return;
      recentRef.current.set(notification.fingerprint, now);
      push(notification.message, notification.tone, 4200);
    });
  }, [canViewOperationalNotifications, isLoading, push]);

  return null;
}
