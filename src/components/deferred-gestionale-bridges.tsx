"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { registerCompatDevTools } from "@/lib/magazzino/compat/compat-dev-tools";
import { AdminLavorazioniNotificationBridge } from "@/src/components/admin-lavorazioni-notification-bridge";
import { AdminWorkshopScheduleNotificationBridge } from "@/src/components/admin-workshop-schedule-notification-bridge";
import { AdminDipendentiPresenzeReminderBridge } from "@/src/components/admin-dipendenti-presenze-reminder-bridge";
import { AdminMagazzinoNotificationBridge } from "@/src/components/admin-magazzino-notification-bridge";
import { AdminPreventiviNotificationBridge } from "@/src/components/admin-preventivi-notification-bridge";
import { AdminScheduledDigestNotificationBridge } from "@/src/components/admin-scheduled-digest-notification-bridge";
import { GestionaleNotificationsBridge } from "@/src/components/gestionale-notifications-bridge";
import { GestionaleRealtimeBridge } from "@/src/components/gestionale-realtime-bridge";
import { GestionaleSnapshotRecoveryBridge } from "@/src/components/gestionale-snapshot-recovery-bridge";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { DesktopNotificationPermissionPrompt } from "@/src/components/desktop-notification-permission-prompt";

/**
 * Monta i bridge realtime/notifiche solo dopo sessione stabile e primo frame,
 * per ridurre churn hook nel bootstrap pre-auth.
 */
export function DeferredGestionaleBridges() {
  const { status, user } = useAuth();
  const authReady = isAuthSessionEstablished(status) && !!user?.id;
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const settingsPayload = useCabAppSettingsPayloadQuery({ tier: "static" });
  const mezziListe = settingsPayload.data?.resolved?.mezziListe;

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

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !mounted) return;
    return registerCompatDevTools({
      queryClient,
      getMezziListe: () => mezziListe,
    });
  }, [mounted, queryClient, mezziListe]);

  if (!mounted) return null;

  return (
    <>
      <DesktopNotificationPermissionPrompt />
      <GestionaleRealtimeBridge />
      <GestionaleNotificationsBridge />
      <AdminLavorazioniNotificationBridge />
      <AdminMagazzinoNotificationBridge />
      <AdminPreventiviNotificationBridge />
      <AdminScheduledDigestNotificationBridge />
      <AdminDipendentiPresenzeReminderBridge />
      <AdminWorkshopScheduleNotificationBridge />
      <GestionaleSnapshotRecoveryBridge />
    </>
  );
}
