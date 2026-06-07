"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { latestUndoableConfigurazioneSave } from "@/lib/configurazione/configurazione-undo-storage";
import { useUndoSessionId } from "@/lib/gestionale-log/use-undo-session-id";
import { CAB_CONFIGURAZIONE_UNDO_REFRESH } from "@/lib/sistema/cab-events";

/** Ultimo salvataggio configurazione annullabile per utente/sessione correnti. */
export function useUndoableConfigurazioneSave(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const sessionId = useUndoSessionId();
  const enabled = options?.enabled !== false;
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const onRefresh = () => setRevision((n) => n + 1);
    window.addEventListener(CAB_CONFIGURAZIONE_UNDO_REFRESH, onRefresh);
    return () => window.removeEventListener(CAB_CONFIGURAZIONE_UNDO_REFRESH, onRefresh);
  }, [enabled]);

  const undoable = useMemo(() => {
    if (!enabled) return null;
    return latestUndoableConfigurazioneSave(user?.id, sessionId);
  }, [enabled, user?.id, sessionId, revision]);

  return { undoable, sessionId, userId: user?.id ?? null };
}
