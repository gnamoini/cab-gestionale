import {
  completePopupRetrySession,
  createPopupRetrySession,
  getPopupRetrySession,
  tryBeginPopupRetry,
  endPopupRetry,
} from "@/lib/browser/popup-retry-session";
import {
  detectPopupInstructionProfile,
  popupContextLabel,
  resolvePopupWhitelistDomain,
} from "@/lib/browser/popup-instructions";
import type {
  DeferredPopupHandle,
  OpenDeferredPopupOptions,
  OpenDeferredPopupResult,
  OpenSafePopupOptions,
  OpenSafePopupResult,
  PopupGuardContext,
  PopupUrlKind,
} from "@/lib/browser/popup-guard-types";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";

export function isDeferredPopupBlocked(
  result: OpenDeferredPopupResult,
): result is { status: "blocked"; sessionId: string } {
  return "status" in result;
}

export { PopupBlockedError } from "@/lib/browser/popup-guard-types";
export type {
  DeferredPopupHandle,
  OpenDeferredPopupOptions,
  OpenDeferredPopupResult,
  OpenSafePopupOptions,
  OpenSafePopupResult,
  PopupGuardContext,
  PopupUrlKind,
} from "@/lib/browser/popup-guard-types";

export type PopupBlockedDialogRequest = {
  sessionId: string;
  context: PopupGuardContext;
  label: string;
  domain: string;
  documentLabel: string;
};

type PopupBlockedDialogHandler = (request: PopupBlockedDialogRequest) => void;

let popupBlockedDialogHandler: PopupBlockedDialogHandler | null = null;

export function registerPopupBlockedDialogHandler(handler: PopupBlockedDialogHandler | null): void {
  popupBlockedDialogHandler = handler;
}

const POPUP_WINDOW_FEATURES = "noopener,noreferrer";

function scheduleBlobUrlRevoke(url: string, revokeAfterMs?: number): void {
  if (revokeAfterMs == null || revokeAfterMs <= 0 || !url.startsWith("blob:")) return;
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }, revokeAfterMs);
}

export function classifyPopupUrlKind(url: string): PopupUrlKind {
  const trimmed = url.trim();
  if (!trimmed || trimmed === "about:blank") return "about_blank";
  if (trimmed.startsWith("blob:")) return "blob";
  if (trimmed.startsWith("/api/")) return "api";
  return "external";
}

function isPopupAlive(win: Window | null): win is Window {
  return win != null && !win.closed;
}

function telemetryMeta(
  context: PopupGuardContext,
  urlKind: PopupUrlKind,
  phase: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    context,
    urlKind,
    phase,
    browserProfile: detectPopupInstructionProfile(),
    ...extra,
  };
}

function requestBlockedDialog(sessionId: string, context: PopupGuardContext, label: string): void {
  popupBlockedDialogHandler?.({
    sessionId,
    context,
    label,
    domain: resolvePopupWhitelistDomain(),
    documentLabel: popupContextLabel(context, label),
  });
}

function handleBlockedPopup(
  opts: OpenSafePopupOptions,
  urlKind: PopupUrlKind,
): { status: "blocked"; sessionId: string } {
  const session = createPopupRetrySession({
    url: opts.url,
    context: opts.context,
    label: opts.label ?? popupContextLabel(opts.context),
    urlKind,
    revokeBlobUrlAfterMs: opts.revokeBlobUrlAfterMs,
  });

  trackRuntimeEvent(RuntimeEvents.popupOpenBlocked, telemetryMeta(opts.context, urlKind, opts.phase ?? "sync"));

  if (opts.showBlockedDialog !== false) {
    requestBlockedDialog(session.id, opts.context, session.label);
  }

  return { status: "blocked", sessionId: session.id };
}

function openPopupWindow(url: string): Window | null {
  if (typeof window === "undefined") return null;
  try {
    return window.open(url, "_blank", POPUP_WINDOW_FEATURES);
  } catch {
    return null;
  }
}

/** Apre URL già pronto (sync o retry). */
export function openSafePopup(opts: OpenSafePopupOptions): OpenSafePopupResult {
  if (typeof window === "undefined") return { status: "invalid_url" };

  const trimmed = opts.url?.trim() ?? "";
  if (!trimmed) return { status: "invalid_url" };

  const urlKind = classifyPopupUrlKind(trimmed);
  const popup = openPopupWindow(trimmed);

  if (!isPopupAlive(popup)) {
    return handleBlockedPopup(opts, urlKind);
  }

  scheduleBlobUrlRevoke(trimmed, opts.revokeBlobUrlAfterMs);
  trackRuntimeEvent(
    RuntimeEvents.popupOpenSuccess,
    telemetryMeta(opts.context, urlKind, opts.phase ?? "sync"),
  );
  return { status: "opened" };
}

function createDeferredHandle(
  popup: Window,
  context: PopupGuardContext,
  label: string,
): DeferredPopupHandle {
  let closed = false;
  let navigated = false;

  return {
    getWindow() {
      if (closed || popup.closed) return null;
      return popup;
    },
    navigate(url, options) {
      const trimmed = url?.trim() ?? "";
      if (!trimmed) return { status: "invalid_url" };
      if (closed || popup.closed) {
        return openSafePopup({
          url: trimmed,
          context,
          label,
          revokeBlobUrlAfterMs: options?.revokeBlobUrlAfterMs,
          phase: "navigate",
        });
      }

      try {
        popup.location.replace(trimmed);
        navigated = true;
        scheduleBlobUrlRevoke(trimmed, options?.revokeBlobUrlAfterMs);
        trackRuntimeEvent(
          RuntimeEvents.popupPreopenSuccess,
          telemetryMeta(context, classifyPopupUrlKind(trimmed), "navigate"),
        );
        return { status: "opened" };
      } catch {
        closed = true;
        try {
          popup.close();
        } catch {
          /* ignore */
        }
        return openSafePopup({
          url: trimmed,
          context,
          label,
          revokeBlobUrlAfterMs: options?.revokeBlobUrlAfterMs,
          phase: "navigate",
        });
      }
    },
    close() {
      if (closed) return;
      closed = true;
      if (!navigated && !popup.closed) {
        try {
          popup.close();
        } catch {
          /* ignore */
        }
      }
    },
    isAlive() {
      return !closed && !popup.closed;
    },
  };
}

/**
 * Pre-apre about:blank sincrono sul click utente (prima di qualsiasi await).
 * Usare navigate() dopo fetch; close() su errore fetch.
 */
export function openDeferredPopup(opts: OpenDeferredPopupOptions): OpenDeferredPopupResult {
  if (typeof window === "undefined") {
    const session = createPopupRetrySession({
      url: "about:blank",
      context: opts.context,
      label: opts.label ?? popupContextLabel(opts.context),
      urlKind: "about_blank",
    });
    return { status: "blocked", sessionId: session.id };
  }

  const label = opts.label ?? popupContextLabel(opts.context);
  const popup = openPopupWindow("about:blank");

  if (!isPopupAlive(popup)) {
    trackRuntimeEvent(
      RuntimeEvents.popupPreopenFailed,
      telemetryMeta(opts.context, "about_blank", "preopen"),
    );
    const blocked = handleBlockedPopup(
      {
        url: "about:blank",
        context: opts.context,
        label,
        showBlockedDialog: opts.showBlockedDialog,
        phase: "preopen",
      },
      "about_blank",
    );
    return blocked;
  }

  trackRuntimeEvent(
    RuntimeEvents.popupPreopenSuccess,
    telemetryMeta(opts.context, "about_blank", "preopen"),
  );

  return createDeferredHandle(popup, opts.context, label);
}

/** Riprova apertura da sessione retry (user gesture sul pulsante Riprova). */
export function retryPopupFromSession(sessionId: string): OpenSafePopupResult {
  const session = getPopupRetrySession(sessionId);
  if (!session) return { status: "invalid_url" };
  if (!tryBeginPopupRetry(sessionId)) return { status: "blocked", sessionId };

  trackRuntimeEvent(
    RuntimeEvents.popupOpenRetry,
    telemetryMeta(session.context, session.urlKind, "retry"),
  );

  const result = openSafePopup({
    url: session.url,
    context: session.context,
    label: session.label,
    revokeBlobUrlAfterMs: session.revokeBlobUrlAfterMs,
    showBlockedDialog: false,
    phase: "retry",
  });

  endPopupRetry(sessionId);

  if (result.status === "opened") {
    completePopupRetrySession(sessionId);
    trackRuntimeEvent(
      RuntimeEvents.popupOpenRetrySuccess,
      telemetryMeta(session.context, session.urlKind, "retry"),
    );
  } else if (result.status === "blocked") {
    requestBlockedDialog(result.sessionId, session.context, session.label);
  }

  return result;
}

/** Apre about:blank per document.write / stampa inline. */
export function openBlankPopupWindow(opts?: {
  context?: PopupGuardContext;
  label?: string;
  showBlockedDialog?: boolean;
}): Window | null {
  const deferredResult = openDeferredPopup({
    context: opts?.context ?? "print",
    label: opts?.label ?? "stampa",
    showBlockedDialog: opts?.showBlockedDialog,
  });
  if (isDeferredPopupBlocked(deferredResult)) return null;
  return deferredResult.getWindow();
}

export function tryOpenViaTemporaryAnchor(url: string, downloadFileName?: string): void {
  if (typeof document === "undefined") return;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  if (downloadFileName?.trim()) {
    a.download = downloadFileName.trim();
  }
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
