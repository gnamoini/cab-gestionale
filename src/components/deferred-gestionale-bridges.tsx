"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { registerCompatDevTools } from "@/lib/magazzino/compat/compat-dev-tools";
import { useSharedAppSettingsQuery } from "@/src/context/app-settings-query-context";

const PwaBridgePack = dynamic(() => import("@/src/components/pwa-bridge-pack"), { ssr: false });
const RealtimePack = dynamic(() => import("@/src/components/gestionale-realtime-bridge-pack"), { ssr: false });
const AdminNotifPack = dynamic(() => import("@/src/components/admin-notification-bridge-pack"), { ssr: false });

function GestionaleBridgesPack({
  queryClient,
  mezziListe,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  mezziListe: ReturnType<typeof useSharedAppSettingsQuery> extends infer Q
    ? Q extends { data: infer D }
      ? D extends { resolved: { mezziListe: infer M } }
        ? M
        : undefined
      : undefined
    : undefined;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const scheduleMount = () => {
      if (!cancelled) setReady(true);
    };
    if (typeof requestIdleCallback === "function") {
      const idleId = requestIdleCallback(scheduleMount, { timeout: 2000 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }
    const rafId = requestAnimationFrame(scheduleMount);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !ready) return;
    return registerCompatDevTools({
      queryClient,
      getMezziListe: () => mezziListe,
    });
  }, [ready, queryClient, mezziListe]);

  if (!ready) return null;

  return (
    <>
      <PwaBridgePack />
      <RealtimePack />
      <AdminNotifPack />
    </>
  );
}

/**
 * Monta i bridge realtime/notifiche solo dopo sessione stabile e primo frame,
 * per ridurre churn hook nel bootstrap pre-auth.
 */
export function DeferredGestionaleBridges() {
  const { status, user } = useAuth();
  const authReady = isAuthSessionEstablished(status) && !!user?.id;
  const queryClient = useQueryClient();
  const settingsPayload = useSharedAppSettingsQuery();
  const mezziListe = settingsPayload?.data?.resolved?.mezziListe;

  if (!authReady) return null;

  return <GestionaleBridgesPack queryClient={queryClient} mezziListe={mezziListe} />;
}
