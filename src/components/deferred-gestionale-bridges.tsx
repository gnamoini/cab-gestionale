"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { registerCompatDevTools } from "@/lib/magazzino/compat/compat-dev-tools";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

const PwaBridgePack = dynamic(() => import("@/src/components/pwa-bridge-pack"), { ssr: false });
const RealtimePack = dynamic(() => import("@/src/components/gestionale-realtime-bridge-pack"), { ssr: false });
const AdminNotifPack = dynamic(() => import("@/src/components/admin-notification-bridge-pack"), { ssr: false });

/**
 * Monta i bridge realtime/notifiche solo dopo sessione stabile e primo frame,
 * per ridurre churn hook nel bootstrap pre-auth.
 */
export function DeferredGestionaleBridges() {
  const { status, user } = useAuth();
  const authReady = isAuthSessionEstablished(status) && !!user?.id;
  const isAdmin = user?.ruolo === "admin";
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const settingsPayload = useCabAppSettingsPayloadQuery({ tier: "static" });
  const mezziListe = settingsPayload.data?.resolved?.mezziListe;

  useEffect(() => {
    if (!authReady) {
      setMounted(false);
      return;
    }
    let cancelled = false;
    const scheduleMount = () => {
      if (!cancelled) setMounted(true);
    };
    if (typeof requestIdleCallback === "function") {
      const idleId = requestIdleCallback(scheduleMount, { timeout: 2000 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
        setMounted(false);
      };
    }
    const rafId = requestAnimationFrame(scheduleMount);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
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
      <PwaBridgePack />
      <RealtimePack />
      {isAdmin ? <AdminNotifPack /> : null}
    </>
  );
}
