const UNDO_SESSION_STORAGE_KEY = "gestionale-undo-session-id";

/** Sessione undo browser (sessionStorage): isolata per tab e resettata al login/logout. */
export function getOrCreateUndoSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.sessionStorage.getItem(UNDO_SESSION_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(UNDO_SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Nuova sessione undo dopo login esplicito. */
export function beginUndoSession(): string {
  if (typeof window === "undefined") return "";
  try {
    const id = crypto.randomUUID();
    window.sessionStorage.setItem(UNDO_SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return "";
  }
}

export function resetUndoSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(UNDO_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Arricchisce payload log client-side con sessione undo corrente. */
export function withUndoSessionPayload<T extends Record<string, unknown>>(payload: T): T & { undo_session_id?: string } {
  const sessionId = getOrCreateUndoSessionId();
  if (!sessionId) return payload;
  return { ...payload, undo_session_id: sessionId };
}
