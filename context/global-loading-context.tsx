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
import { GlobalLoadingOverlay } from "@/components/design-system/global-loading";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";

const SHOW_DELAY_MS = 300;

type StackEntry = { id: number; message: string };

type GlobalLoadingContextValue = {
  /** Stack attivo (messaggio in cima). */
  message: string;
  active: boolean;
  /** Registra un loading; ritorna funzione di release. */
  push: (message: string) => () => void;
  /** Aggiorna il messaggio dell’entry più recente (se presente). */
  setTopMessage: (message: string) => void;
};

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(null);

function useDelayedActive(active: boolean, delayMs = SHOW_DELAY_MS): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(t);
  }, [active, delayMs]);
  return visible;
}

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string) => {
    const id = ++idRef.current;
    const normalized = message.trim() || GLOBAL_LOADING_MESSAGES.default;
    setStack((s) => [...s, { id, message: normalized }]);
    return () => setStack((s) => s.filter((e) => e.id !== id));
  }, []);

  const setTopMessage = useCallback((message: string) => {
    const normalized = message.trim() || GLOBAL_LOADING_MESSAGES.default;
    setStack((s) => {
      if (s.length === 0) return s;
      const next = [...s];
      next[next.length - 1] = { ...next[next.length - 1]!, message: normalized };
      return next;
    });
  }, []);

  const active = stack.length > 0;
  const message = stack[stack.length - 1]?.message ?? GLOBAL_LOADING_MESSAGES.default;
  const overlayVisible = useDelayedActive(active);

  const value = useMemo<GlobalLoadingContextValue>(
    () => ({ message, active, push, setTopMessage }),
    [message, active, push, setTopMessage],
  );

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
      <GlobalLoadingOverlay visible={overlayVisible} message={message} />
    </GlobalLoadingContext.Provider>
  );
}

export function useGlobalLoadingState(): { active: boolean; visible: boolean; message: string } {
  const ctx = useContext(GlobalLoadingContext);
  if (!ctx) {
    return { active: false, visible: false, message: GLOBAL_LOADING_MESSAGES.default };
  }
  const visible = useDelayedActive(ctx.active);
  return { active: ctx.active, visible, message: ctx.message };
}

/** API imperativa: `const release = show('…');` … `release()`. */
export function useShowGlobalLoading(): (message: string) => () => void {
  const ctx = useContext(GlobalLoadingContext);
  if (!ctx) {
    return () => () => {};
  }
  return ctx.push;
}

/**
 * Registra loading globale mentre `message` è valorizzato (null/undefined = off).
 * Ritardo 300ms gestito dal provider overlay.
 */
export function useGlobalLoading(message: string | null | undefined): void {
  const ctx = useContext(GlobalLoadingContext);
  const pushRef = useRef(ctx?.push);
  pushRef.current = ctx?.push;

  useEffect(() => {
    if (!message?.trim() || !pushRef.current) return;
    return pushRef.current(message.trim());
  }, [message]);
}

/** Sincronizza un singolo slot loading da bridge esterni (es. React Query opt-in). */
export function useGlobalLoadingContextBridge(): (message: string | null) => void {
  const ctx = useContext(GlobalLoadingContext);
  const releaseRef = useRef<(() => void) | null>(null);

  const push = ctx?.push;

  return useCallback(
    (message: string | null) => {
      releaseRef.current?.();
      releaseRef.current = null;
      if (message?.trim() && push) {
        releaseRef.current = push(message.trim());
      }
    },
    [push],
  );
}
