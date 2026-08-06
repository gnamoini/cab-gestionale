"use client";

import { memo, useEffect } from "react";
import { isAuthSessionEstablished, useAuth } from "@/context/auth-context";
import { isGestionaleDirtySyncEnabled } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { recoverGestionaleDirtyOnResume } from "@/lib/sync/gestionale-dirty-resume";
import { registerGestionaleResumeHandler } from "@/lib/sync/gestionale-resume-coordinator";

/** Resume lifecycle debounced → version check (no transport reconnect). */
export const GestionaleResumeBridge = memo(function GestionaleResumeBridge() {
  const { status } = useAuth();
  const authReady = isAuthSessionEstablished(status);

  useEffect(() => {
    if (!authReady || !isGestionaleDirtySyncEnabled()) return;
    return registerGestionaleResumeHandler(() => {
      void recoverGestionaleDirtyOnResume();
    });
  }, [authReady]);

  return null;
});
