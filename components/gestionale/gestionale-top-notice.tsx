"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { LoadingSpinner } from "@/components/design-system/loading";
import { loadingCaptionClass } from "@/components/design-system/loading/loading-tokens";
import { useIsWinningClaim, useLoadingClaim } from "@/context/global-loading-context";
import { dsFocus, dsToastItem } from "@/lib/ui/design-system";

export type GestionaleTopNoticeTone = "info" | "warning";

export type GestionaleTopNoticeAction = {
  label: string;
  onClick: () => void;
};

type GestionaleTopNoticeEntry = {
  id: string;
  message: string;
  tone: GestionaleTopNoticeTone;
  busy?: boolean;
  action?: GestionaleTopNoticeAction;
};

type GestionaleTopNoticeContextValue = {
  upsert: (entry: GestionaleTopNoticeEntry) => void;
  remove: (id: string) => void;
};

const NOTICE_ORDER: Record<string, number> = {
  auth: 0,
  settings: 1,
  "settings-error": 2,
};

const INFO_SURFACE =
  "border-[color:color-mix(in_srgb,var(--cab-info)_38%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-info)_10%,var(--cab-card))]";

const WARNING_SURFACE =
  "border-[color:color-mix(in_srgb,var(--cab-warning)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-card))]";

const NOTICE_STACK_STEP_REM = 3.25;

const GestionaleTopNoticeContext = createContext<GestionaleTopNoticeContextValue | null>(null);

function noticeSortKey(id: string): number {
  return NOTICE_ORDER[id] ?? 100;
}

function GestionaleTopNoticeItem({ entry }: { entry: GestionaleTopNoticeEntry }) {
  const surface = entry.tone === "warning" ? WARNING_SURFACE : INFO_SURFACE;
  const maxWidth = entry.tone === "warning" ? "max-w-[min(100%,28rem)]" : "max-w-[min(100%,24rem)]";

  return (
    <div
      role="status"
      aria-busy={entry.busy ? true : undefined}
      className={`cab-toast-item ${dsToastItem} ${surface} ${maxWidth}`}
    >
      {entry.tone === "info" ? (
        <LoadingSpinner size="sm" label={entry.message} />
      ) : null}
      <p className={`min-w-0 flex-1 ${loadingCaptionClass} text-[color:var(--cab-text)]`}>{entry.message}</p>
      {entry.action ? (
        <button
          type="button"
          className={`pointer-events-auto shrink-0 text-xs font-semibold underline ${dsFocus}`}
          onClick={entry.action.onClick}
        >
          {entry.action.label}
        </button>
      ) : null}
    </div>
  );
}

function GestionaleTopNoticeHost({ entries }: { entries: GestionaleTopNoticeEntry[] }) {
  if (entries.length === 0) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[35] px-3 sm:px-4"
      aria-live="polite"
      aria-relevant="additions"
    >
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className="pointer-events-none absolute inset-x-0 flex justify-center"
          style={{
            top: `calc(3.5rem + env(safe-area-inset-top, 0px) + 0.5rem + ${index * NOTICE_STACK_STEP_REM}rem)`,
          }}
        >
          <div className="cab-toast-slot pointer-events-none">
            <GestionaleTopNoticeItem entry={entry} />
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function GestionaleTopNoticeProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<GestionaleTopNoticeEntry[]>([]);

  const upsert = useCallback((entry: GestionaleTopNoticeEntry) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== entry.id);
      next.push(entry);
      next.sort((a, b) => noticeSortKey(a.id) - noticeSortKey(b.id));
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const value = useMemo(() => ({ upsert, remove }), [upsert, remove]);

  return (
    <GestionaleTopNoticeContext.Provider value={value}>
      {children}
      <GestionaleTopNoticeHost entries={entries} />
    </GestionaleTopNoticeContext.Provider>
  );
}

export type UseGestionaleTopNoticeOptions = {
  visible: boolean;
  message: string;
  tone?: GestionaleTopNoticeTone;
  busy?: boolean;
  action?: GestionaleTopNoticeAction;
  /** Ritardo prima di mostrare la notifica (evita flash su caricamenti rapidi). */
  showDelayMs?: number;
};

/**
 * Registra una notifica fissa sotto l'header gestionale senza spostare il layout.
 */
export function useGestionaleTopNotice(id: string, options: UseGestionaleTopNoticeOptions) {
  const ctx = useContext(GestionaleTopNoticeContext);
  const [delayedVisible, setDelayedVisible] = useState(false);
  const { visible, message, tone = "info", busy, action, showDelayMs = 0 } = options;

  useEffect(() => {
    if (!visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
      setDelayedVisible(false);
      return;
    }
    if (showDelayMs <= 0) {
      setDelayedVisible(true);
      return;
    }
    const timerId = window.setTimeout(() => setDelayedVisible(true), showDelayMs);
    return () => window.clearTimeout(timerId);
  }, [visible, showDelayMs]);

  const claimActive = visible && delayedVisible;
  useLoadingClaim("banner", id, claimActive, { message });
  const canRender = useIsWinningClaim("banner", id, claimActive);

  useEffect(() => {
    if (!ctx) return;
    if (!canRender) {
      ctx.remove(id);
      return;
    }
    ctx.upsert({ id, message, tone, busy, action });
    return () => ctx.remove(id);
  }, [ctx, id, canRender, message, tone, busy, action]);
}
