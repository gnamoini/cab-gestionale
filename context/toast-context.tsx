"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  dsFocus,
  dsToastDismiss,
  dsToastIconWrap,
  dsToastItem,
  dsToastMessage,
  dsToastViewport,
  dsZToast,
} from "@/lib/ui/design-system";
import {
  useToastSwipeDismiss,
  useToastSwipeEnabled,
} from "@/lib/ui/use-toast-swipe-dismiss";
import {
  warnDirectUseToast,
  warnTechnicalErrorToast,
} from "@/src/lib/ux/interaction-enforcement";

export type CabToastTone = "success" | "warning" | "error" | "info";

type ToastItem = { id: string; message: string; tone: CabToastTone; duration: number };

const TONE_ACCENT: Record<CabToastTone, string> = {
  success: "border-l-[3px] border-l-[color:var(--cab-success)]",
  warning: "border-l-[3px] border-l-[color:var(--cab-warning)]",
  error: "border-l-[3px] border-l-[color:var(--cab-danger)]",
  info: "border-l-[3px] border-l-[color:var(--cab-info)]",
};

const TONE_ICON_WRAP: Record<CabToastTone, string> = {
  success: "text-[color:var(--cab-success)]",
  warning: "text-[color:var(--cab-warning)]",
  error: "text-[color:var(--cab-danger)]",
  info: "text-[color:var(--cab-info)]",
};

function CabToastToneIcon({ tone }: { tone: CabToastTone }) {
  const className = "h-[1.125rem] w-[1.125rem] shrink-0";
  if (tone === "success") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  if (tone === "warning") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  );
}

type ToastContextValue = {
  push: (message: string, tone?: CabToastTone, durationMs?: number) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let externalToastPush: ToastContextValue["push"] | null = null;
let externalToastClear: ToastContextValue["clear"] | null = null;

/** Per moduli non-React (es. apertura PDF) — registrato da ToastProvider. */
export function pushGestionaleToast(
  message: string,
  tone: CabToastTone = "info",
  durationMs?: number,
) {
  externalToastPush?.(message, tone, durationMs);
}

/** Pulisce tutte le notifiche attive (es. logout/session expiry). */
export function clearGestionaleToasts() {
  externalToastClear?.();
}

const TOAST_EXIT_MS = 220;

function CabToastItem({
  toast,
  exiting,
  onDismiss,
}: {
  toast: ToastItem;
  exiting: boolean;
  onDismiss: (id: string) => void;
}) {
  const swipeEnvEnabled = useToastSwipeEnabled();
  const { itemRef, itemProps, itemStyle, itemClassName } = useToastSwipeDismiss({
    onDismiss: () => onDismiss(toast.id),
    enabled: swipeEnvEnabled && !exiting,
  });

  return (
    <div className={`cab-toast-slot ${exiting ? "cab-toast-slot--out" : ""}`}>
      <div
        ref={itemRef}
        role={toast.tone === "error" ? "alert" : "status"}
        className={`cab-toast-item ${dsToastItem} ${TONE_ACCENT[toast.tone]} ${itemClassName ?? ""}`}
        style={itemStyle}
        {...itemProps}
      >
        <span className={`${dsToastIconWrap} ${TONE_ICON_WRAP[toast.tone]}`} aria-hidden>
          <CabToastToneIcon tone={toast.tone} />
        </span>
        <p className={dsToastMessage}>{toast.message}</p>
        <button
          type="button"
          className={`${dsToastDismiss} ${dsFocus}`}
          onClick={() => onDismiss(toast.id)}
          aria-label="Chiudi notifica"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function CabToastViewport({
  toasts,
  exitingIds,
  onDismiss,
}: {
  toasts: ToastItem[];
  exitingIds: ReadonlySet<string>;
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className={`${dsToastViewport} ${dsZToast}`}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((t) => (
        <CabToastItem
          key={t.id}
          toast={t}
          exiting={exitingIds.has(t.id)}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const exitTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
    setExitingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const tm = timers.current.get(id);
    if (tm) clearTimeout(tm);
    timers.current.delete(id);
    const exitTm = exitTimers.current.get(id);
    if (exitTm) clearTimeout(exitTm);
    exitTimers.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      let shouldAnimate = false;
      setExitingIds((prev) => {
        if (prev.has(id)) return prev;
        shouldAnimate = true;
        return new Set(prev).add(id);
      });
      if (!shouldAnimate) return;
      const tm = timers.current.get(id);
      if (tm) clearTimeout(tm);
      timers.current.delete(id);
      exitTimers.current.set(
        id,
        setTimeout(() => remove(id), TOAST_EXIT_MS),
      );
    },
    [remove],
  );

  const recentPushRef = useRef<Map<string, number>>(new Map());
  const DEDUP_MS = 3000;

  const clear = useCallback(() => {
    timers.current.forEach((tm) => clearTimeout(tm));
    timers.current.clear();
    exitTimers.current.forEach((tm) => clearTimeout(tm));
    exitTimers.current.clear();
    setExitingIds(new Set());
    setToasts([]);
    recentPushRef.current.clear();
  }, []);

  const push = useCallback(
    (message: string, tone: CabToastTone = "info", durationMs = 4200) => {
      if (tone === "error") warnTechnicalErrorToast(message);
      const now = Date.now();
      const dedupKey = `${tone}:${message}`;
      const last = recentPushRef.current.get(dedupKey);
      if (last != null && now - last < DEDUP_MS) return;
      recentPushRef.current.set(dedupKey, now);
      for (const [k, t] of recentPushRef.current) {
        if (now - t > DEDUP_MS * 2) recentPushRef.current.delete(k);
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const duration = Math.max(1800, Math.min(durationMs, 12000));
      setToasts((prev) => [...prev, { id, message, tone, duration }].slice(-5));
      const tm = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, tm);
    },
    [dismiss],
  );

  useEffect(() => {
    const timersMap = timers.current;
    const exitTimersMap = exitTimers.current;
    return () => {
      timersMap.forEach((t) => clearTimeout(t));
      timersMap.clear();
      exitTimersMap.forEach((t) => clearTimeout(t));
      exitTimersMap.clear();
    };
  }, []);

  const value = useMemo(() => ({ push, clear }), [clear, push]);

  useEffect(() => {
    externalToastPush = push;
    externalToastClear = clear;
    return () => {
      if (externalToastPush === push) externalToastPush = null;
      if (externalToastClear === clear) externalToastClear = null;
    };
  }, [clear, push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <CabToastViewport toasts={toasts} exitingIds={exitingIds} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/** API interna: provider, bridge e `useGestionaleToast` — senza warn dev. */
export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/** Solo per import diretti fuori allowlist; in dev warn throttled per caller (non a ogni render). */
export function useToast() {
  const ctx = useToastContext();
  const stackRef = useRef<string | undefined>(undefined);
  if (stackRef.current === undefined) {
    stackRef.current = new Error().stack;
  }
  useEffect(() => {
    warnDirectUseToast(stackRef.current);
  }, []);
  return ctx;
}
