/**
 * Debug overlay + event ring buffer per collaudo focus mobile (dev / flag only).
 */

export type FocusVisibilityDebugEvent = {
  event: string;
  transaction?: number;
  delta?: number;
  reason?: string;
  scrollOwner?: string;
  status?: string;
  at: number;
  [key: string]: unknown;
};

const RING_MAX = 50;

declare global {
  interface Window {
    __CAB_FOCUS_DEBUG?: boolean;
    __CAB_FOCUS_DEBUG_EVENTS?: FocusVisibilityDebugEvent[];
  }
}

export function isFocusVisibilityDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_CAB_FOCUS_DEBUG !== "true") {
    return false;
  }
  return Boolean(window.__CAB_FOCUS_DEBUG);
}

export function emitFocusVisibilityDebugEvent(payload: Omit<FocusVisibilityDebugEvent, "at">): void {
  if (!isFocusVisibilityDebugEnabled() || typeof window === "undefined") return;
  const entry = { ...payload, at: Date.now() } as FocusVisibilityDebugEvent;
  if (!Array.isArray(window.__CAB_FOCUS_DEBUG_EVENTS)) {
    window.__CAB_FOCUS_DEBUG_EVENTS = [];
  }
  const buf = window.__CAB_FOCUS_DEBUG_EVENTS;
  buf.push(entry);
  if (buf.length > RING_MAX) buf.shift();
  if (process.env.NODE_ENV !== "production") {
    console.debug("[cab-focus]", entry);
  }
}

export function renderFocusVisibilityDebugOverlay(data: {
  visibleTop: number;
  visibleBottom: number;
  blockTop: number;
  blockBottom: number;
  delta: number;
  transactionId: number;
}): void {
  if (!isFocusVisibilityDebugEnabled() || typeof document === "undefined") return;
  let el = document.getElementById("cab-focus-debug-overlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "cab-focus-debug-overlay";
    el.setAttribute(
      "style",
      "position:fixed;left:8px;bottom:8px;z-index:99999;font:11px/1.4 monospace;background:rgba(0,0,0,.82);color:#0f0;padding:8px 10px;border-radius:6px;pointer-events:none;max-width:min(92vw,320px);white-space:pre;",
    );
    document.body.appendChild(el);
  }
  el.textContent = [
    `TX #${data.transactionId}`,
    `VISIBLE: ${Math.round(data.visibleTop)}–${Math.round(data.visibleBottom)}`,
    `BLOCK: ${Math.round(data.blockTop)}–${Math.round(data.blockBottom)}`,
    `DELTA: ${data.delta === 0 ? "0 (skip)" : `${data.delta > 0 ? "+" : ""}${Math.round(data.delta)}px`}`,
  ].join("\n");
}
