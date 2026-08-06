import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import type { PopupGuardContext, PopupUrlKind } from "@/lib/browser/popup-guard-types";

export const POPUP_RETRY_SESSION_TTL_MS = 120_000;

export type PopupRetrySession = {
  id: string;
  url: string;
  context: PopupGuardContext;
  label: string;
  urlKind: PopupUrlKind;
  revokeBlobUrlAfterMs?: number;
  createdAt: number;
  retryInFlight: boolean;
};

let activeSession: PopupRetrySession | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;

function clearExpiryTimer(): void {
  if (expiryTimer != null) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

function revokeBlobUrl(url: string): void {
  if (!url.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

function scheduleBlobRevoke(session: PopupRetrySession): void {
  const ms = session.revokeBlobUrlAfterMs;
  if (ms == null || ms <= 0 || !session.url.startsWith("blob:")) return;
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    if (activeSession?.id === session.id) {
      revokeBlobUrl(session.url);
    }
  }, ms);
}

function expireSession(sessionId: string): void {
  if (!activeSession || activeSession.id !== sessionId) return;
  revokeBlobUrl(activeSession.url);
  trackRuntimeEvent(RuntimeEvents.popupSessionExpired, {
    context: activeSession.context,
    urlKind: activeSession.urlKind,
    phase: "retry",
  });
  activeSession = null;
  clearExpiryTimer();
}

function scheduleExpiry(session: PopupRetrySession): void {
  clearExpiryTimer();
  expiryTimer = setTimeout(() => expireSession(session.id), POPUP_RETRY_SESSION_TTL_MS);
}

function createSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createPopupRetrySession(input: {
  url: string;
  context: PopupGuardContext;
  label: string;
  urlKind: PopupUrlKind;
  revokeBlobUrlAfterMs?: number;
}): PopupRetrySession {
  if (activeSession) {
    revokeBlobUrl(activeSession.url);
    clearExpiryTimer();
  }

  const session: PopupRetrySession = {
    id: createSessionId(),
    url: input.url.trim(),
    context: input.context,
    label: input.label,
    urlKind: input.urlKind,
    revokeBlobUrlAfterMs: input.revokeBlobUrlAfterMs,
    createdAt: Date.now(),
    retryInFlight: false,
  };

  activeSession = session;
  scheduleExpiry(session);
  scheduleBlobRevoke(session);
  return session;
}

export function getActivePopupRetrySession(): PopupRetrySession | null {
  if (!activeSession) return null;
  if (Date.now() - activeSession.createdAt > POPUP_RETRY_SESSION_TTL_MS) {
    expireSession(activeSession.id);
    return null;
  }
  return activeSession;
}

export function getPopupRetrySession(sessionId: string): PopupRetrySession | null {
  const session = getActivePopupRetrySession();
  if (!session || session.id !== sessionId) return null;
  return session;
}

export function clearPopupRetrySession(sessionId?: string): void {
  if (!activeSession) return;
  if (sessionId != null && activeSession.id !== sessionId) return;
  revokeBlobUrl(activeSession.url);
  activeSession = null;
  clearExpiryTimer();
}

export function tryBeginPopupRetry(sessionId: string): boolean {
  const session = getPopupRetrySession(sessionId);
  if (!session || session.retryInFlight) return false;
  session.retryInFlight = true;
  return true;
}

export function endPopupRetry(sessionId: string): void {
  const session = getPopupRetrySession(sessionId);
  if (!session) return;
  session.retryInFlight = false;
}

export function completePopupRetrySession(sessionId: string): void {
  const session = getPopupRetrySession(sessionId);
  if (!session) return;
  if (session.url.startsWith("blob:")) {
    scheduleBlobRevoke(session);
  }
  activeSession = null;
  clearExpiryTimer();
}
