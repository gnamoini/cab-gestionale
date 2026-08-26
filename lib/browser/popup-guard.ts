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

/** URL salvabile in sessione retry (mai `blob:` pre-generazione né `about:blank`). */
export function resolvePopupRetrySessionUrl(
  url: string,
  retryUrl?: string,
): string | null {
  const candidate = (retryUrl ?? url).trim();
  if (!candidate || candidate === "about:blank") return null;
  if (candidate.startsWith("blob:")) return null;
  return candidate;
}

function resolveBlockedSessionUrl(opts: OpenSafePopupOptions): string {
  if (opts.phase === "navigate") {
    return opts.url.trim();
  }
  if (opts.phase === "preopen") {
    return resolvePopupRetrySessionUrl("", opts.retryUrl) ?? "about:blank";
  }
  return resolvePopupRetrySessionUrl(opts.url, opts.retryUrl) ?? opts.url.trim();
}

function handleBlockedPopup(
  opts: OpenSafePopupOptions,
  urlKind: PopupUrlKind,
): { status: "blocked"; sessionId: string } {
  const sessionUrl = resolveBlockedSessionUrl(opts);

  const session = createPopupRetrySession({
    url: sessionUrl,
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

function detachOpener(popup: Window): void {
  try {
    popup.opener = null;
  } catch {
    /* cross-origin / policy */
  }
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function tryLocationReplace(popup: Window, url: string): boolean {
  try {
    if (popup.closed) return false;
    popup.location.replace(url);
    return true;
  } catch {
    return false;
  }
}

/** ponytail: iframe blob solo se `location.replace` fallisce — CSP `object-src 'none'` vieta embed */
function tryIframeBlobPdfInPopup(popup: Window, blobUrl: string, title: string): boolean {
  try {
    if (popup.closed) return false;
    const doc = popup.document;
    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtmlAttr(title)}</title>` +
        `<style>html,body{margin:0;height:100%;overflow:hidden;}iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}</style></head>` +
        `<body><iframe src="${escapeHtmlAttr(blobUrl)}" title="${escapeHtmlAttr(title)}"></iframe></body></html>`,
    );
    doc.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Naviga una tab pre-aperta verso un blob PDF.
 * 1. location.replace(blobUrl) — viewer nativo
 * 2. iframe blob via document.write — fallback tecnico
 */
function navigateBlobPdfInPopup(popup: Window, blobUrl: string, title: string): boolean {
  if (popup.closed) return false;
  if (tryLocationReplace(popup, blobUrl)) return true;
  if (popup.closed) return false;
  return tryIframeBlobPdfInPopup(popup, blobUrl, title);
}

/**
 * ponytail: no `noopener,noreferrer` as third arg — Chromium returns `null` even when the tab opens.
 * Detach opener after open instead; deferred flows need a live WindowProxy for `location.replace`.
 */
function openPopupWindow(url: string): Window | null {
  if (typeof window === "undefined") return null;
  try {
    const popup = window.open(url, "_blank");
    if (popup) detachOpener(popup);
    return popup;
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
  const label = opts.label ?? popupContextLabel(opts.context);

  if (trimmed.startsWith("blob:")) {
    const popup = openPopupWindow("about:blank");
    if (!isPopupAlive(popup)) {
      return handleBlockedPopup(opts, urlKind);
    }
    if (!navigateBlobPdfInPopup(popup, trimmed, label)) {
      closePopupWindow(popup);
      return handleBlockedPopup(opts, urlKind);
    }
    scheduleBlobUrlRevoke(trimmed, opts.revokeBlobUrlAfterMs);
    trackRuntimeEvent(
      RuntimeEvents.popupOpenSuccess,
      telemetryMeta(opts.context, urlKind, opts.phase ?? "sync"),
    );
    return { status: "opened" };
  }

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

function closePopupWindow(popup: Window): void {
  if (popup.closed) return;
  try {
    popup.close();
  } catch {
    /* ignore */
  }
}

function createDeferredHandle(
  popup: Window,
  context: PopupGuardContext,
  label: string,
  showBlockedDialog?: boolean,
): DeferredPopupHandle {
  let closed = false;
  let navigated = false;

  const blockNavigate = (
    url: string,
    options?: { revokeBlobUrlAfterMs?: number },
  ): { status: "blocked"; sessionId: string } => {
    if (!closed && !popup.closed) {
      closePopupWindow(popup);
    }
    closed = true;
    return handleBlockedPopup(
      {
        url,
        context,
        label,
        revokeBlobUrlAfterMs: options?.revokeBlobUrlAfterMs,
        showBlockedDialog,
        phase: "navigate",
      },
      classifyPopupUrlKind(url),
    );
  };

  return {
    getWindow() {
      if (closed || popup.closed) return null;
      return popup;
    },
    navigate(url, options) {
      const trimmed = url?.trim() ?? "";
      if (!trimmed) return { status: "invalid_url" };
      if (closed || popup.closed) {
        return blockNavigate(trimmed, options);
      }

      if (trimmed.startsWith("blob:")) {
        if (!navigateBlobPdfInPopup(popup, trimmed, label)) {
          return blockNavigate(trimmed, options);
        }
      } else if (!tryLocationReplace(popup, trimmed)) {
        return blockNavigate(trimmed, options);
      }

      navigated = true;
      scheduleBlobUrlRevoke(trimmed, options?.revokeBlobUrlAfterMs);
      trackRuntimeEvent(
        RuntimeEvents.popupPreopenSuccess,
        telemetryMeta(context, classifyPopupUrlKind(trimmed), "navigate"),
      );
      return { status: "opened" };
    },
    close() {
      if (closed) return;
      closed = true;
      if (!navigated && !popup.closed) {
        closePopupWindow(popup);
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
  const label = opts.label ?? popupContextLabel(opts.context);
  const retryUrl = resolvePopupRetrySessionUrl("", opts.retryUrl) ?? undefined;

  if (typeof window === "undefined") {
    const session = createPopupRetrySession({
      url: retryUrl ?? "about:blank",
      context: opts.context,
      label,
      urlKind: retryUrl ? classifyPopupUrlKind(retryUrl) : "about_blank",
    });
    return { status: "blocked", sessionId: session.id };
  }

  const popup = openPopupWindow("about:blank");

  if (!isPopupAlive(popup)) {
    trackRuntimeEvent(
      RuntimeEvents.popupPreopenFailed,
      telemetryMeta(opts.context, "about_blank", "preopen"),
    );
    const blocked = handleBlockedPopup(
      {
        url: "about:blank",
        retryUrl,
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

  return createDeferredHandle(popup, opts.context, label, opts.showBlockedDialog);
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

  const retryTarget = session.url.trim();
  if (!retryTarget || retryTarget === "about:blank") {
    endPopupRetry(sessionId);
    return { status: "blocked", sessionId };
  }

  const result = openSafePopup({
    url: retryTarget,
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
