"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { latestUndoableLogForUserSession } from "@/lib/gestionale-log/undo";
import { useUndoSessionId } from "@/lib/gestionale-log/use-undo-session-id";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";

type UseUndoableLogOptions = {
  enabled?: boolean;
  limit?: number;
};

/** Log modifiche + voce undoabile per utente/sessione correnti. */
export function useUndoableLog(entita: string, options?: UseUndoableLogOptions) {
  const { user } = useAuth();
  const sessionId = useUndoSessionId();
  const logQuery = useLogListQuery(
    { entita, limit: options?.limit ?? 120 },
    { enabled: options?.enabled !== false && Boolean(user?.id), staleTime: 15_000, retry: 1 },
  );
  const undoable = useMemo(
    () => latestUndoableLogForUserSession(logQuery.data ?? [], entita, user?.id, sessionId),
    [logQuery.data, entita, user?.id, sessionId],
  );
  return { undoable, logQuery, sessionId, userId: user?.id ?? null };
}
