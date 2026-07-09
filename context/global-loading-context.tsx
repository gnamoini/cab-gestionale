"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GlobalLoadingOverlay } from "@/components/design-system/global-loading";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { isBootInvestigationEnabled, trackStoreUpdate } from "@/lib/observability/boot-investigation";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import {
  claimKey,
  isClaimWinning,
  isSurfaceActive,
  resolveOverlayMessage,
  resolveWinningSurface,
  type LoadingClaimRecord,
  type LoadingSurface,
} from "@/lib/ui/loading-manager";

const SHOW_DELAY_MS = 300;

type StackEntry = { id: number; message: string };

type LoadingManagerContextValue = {
  /** Stack overlay legacy (push imperativo). */
  message: string;
  active: boolean;
  push: (message: string) => () => void;
  setTopMessage: (message: string) => void;
  /** LoadingManager — claim per surface. */
  winningSurface: LoadingSurface | null;
  registerClaim: (surface: LoadingSurface, id: string, message?: string) => void;
  unregisterClaim: (surface: LoadingSurface, id: string) => void;
  claims: Map<string, LoadingClaimRecord>;
};

const LoadingManagerContext = createContext<LoadingManagerContextValue | null>(null);

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

/** @deprecated Alias — stesso provider LoadingManager. */
export const GlobalLoadingProvider = LoadingManagerProvider;

export function LoadingManagerProvider({ children }: { children: ReactNode }) {
  useBootInvestigationMount("LoadingManagerProvider");
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [claims, setClaims] = useState<Map<string, LoadingClaimRecord>>(() => new Map());
  const idRef = useRef(0);
  const pushClaimIdRef = useRef(0);

  const push = useCallback((message: string) => {
    const stackId = ++idRef.current;
    const claimId = `push:${++pushClaimIdRef.current}`;
    const normalized = message.trim() || GLOBAL_LOADING_MESSAGES.default;
    setStack((s) => [...s, { id: stackId, message: normalized }]);
    setClaims((prev) => {
      const next = new Map(prev);
      next.set(claimKey("overlay", claimId), { surface: "overlay", id: claimId, message: normalized });
      return next;
    });
    return () => {
      setStack((s) => s.filter((e) => e.id !== stackId));
      setClaims((prev) => {
        const next = new Map(prev);
        next.delete(claimKey("overlay", claimId));
        return next;
      });
    };
  }, []);

  const setTopMessage = useCallback((message: string) => {
    const normalized = message.trim() || GLOBAL_LOADING_MESSAGES.default;
    setStack((s) => {
      if (s.length === 0) return s;
      const next = [...s];
      next[next.length - 1] = { ...next[next.length - 1]!, message: normalized };
      return next;
    });
    setClaims((prev) => {
      const overlayClaims = [...prev.values()].filter((c) => c.surface === "overlay");
      const last = overlayClaims[overlayClaims.length - 1];
      if (!last) return prev;
      const next = new Map(prev);
      next.set(claimKey("overlay", last.id), { ...last, message: normalized });
      return next;
    });
  }, []);

  const registerClaim = useCallback((surface: LoadingSurface, id: string, message?: string) => {
    setClaims((prev) => {
      const next = new Map(prev);
      next.set(claimKey(surface, id), { surface, id, message: message?.trim() || undefined });
      return next;
    });
  }, []);

  const unregisterClaim = useCallback((surface: LoadingSurface, id: string) => {
    setClaims((prev) => {
      const key = claimKey(surface, id);
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const claimList = useMemo(() => [...claims.values()], [claims]);
  const winningSurface = useMemo(() => resolveWinningSurface(claimList), [claimList]);
  const overlayActive = winningSurface === "overlay";
  const message = resolveOverlayMessage(claimList, GLOBAL_LOADING_MESSAGES.default);
  const overlayVisible = useDelayedActive(overlayActive);

  const stackActive = stack.length > 0;
  const prevActiveRef = useRef(overlayActive);
  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    if (prevActiveRef.current === overlayActive) return;
    trackStoreUpdate("globalLoading", prevActiveRef.current, overlayActive, {
      message,
      stackDepth: stack.length,
      winningSurface,
    });
    prevActiveRef.current = overlayActive;
  }, [overlayActive, message, stack.length, winningSurface]);

  const value = useMemo<LoadingManagerContextValue>(
    () => ({
      message,
      active: stackActive || overlayActive,
      push,
      setTopMessage,
      winningSurface,
      registerClaim,
      unregisterClaim,
      claims,
    }),
    [message, stackActive, overlayActive, push, setTopMessage, winningSurface, registerClaim, unregisterClaim, claims],
  );

  return (
    <LoadingManagerContext.Provider value={value}>
      {children}
      <GlobalLoadingOverlay visible={overlayVisible} message={message} />
    </LoadingManagerContext.Provider>
  );
}

export function useGlobalLoadingState(): { active: boolean; visible: boolean; message: string } {
  const ctx = useContext(LoadingManagerContext);
  if (!ctx) {
    return { active: false, visible: false, message: GLOBAL_LOADING_MESSAGES.default };
  }
  const visible = useDelayedActive(ctx.winningSurface === "overlay");
  return {
    active: ctx.winningSurface === "overlay",
    visible,
    message: ctx.message,
  };
}

/** API imperativa: `const release = show('…');` … `release()`. */
export function useShowGlobalLoading(): (message: string) => () => void {
  const ctx = useContext(LoadingManagerContext);
  if (!ctx) {
    return () => () => {};
  }
  return ctx.push;
}

/**
 * Registra un claim loading; auto-release on unmount / quando `active` è false.
 */
export function useLoadingClaim(
  surface: LoadingSurface,
  id: string,
  active: boolean,
  opts?: { message?: string },
): void {
  const ctx = useContext(LoadingManagerContext);
  const message = opts?.message;
  const registerClaim = ctx?.registerClaim;
  const unregisterClaim = ctx?.unregisterClaim;

  useEffect(() => {
    if (!registerClaim || !unregisterClaim || !active) return;
    registerClaim(surface, id, message);
    return () => unregisterClaim(surface, id);
  }, [registerClaim, unregisterClaim, surface, id, active, message]);
}

/** true se la surface vince la competizione globale. */
export function useLoadingSurfaceActive(surface: LoadingSurface): boolean {
  const ctx = useContext(LoadingManagerContext);
  return isSurfaceActive(ctx?.winningSurface ?? null, surface);
}

/** true se questo claim specifico è attivo e la sua surface vince. */
export function useIsWinningClaim(surface: LoadingSurface, id: string, active: boolean): boolean {
  const ctx = useContext(LoadingManagerContext);
  if (!ctx || !active) return false;
  return isClaimWinning(ctx.winningSurface, ctx.claims, surface, id);
}

/**
 * Registra loading globale (overlay) mentre `message` è valorizzato (null/undefined = off).
 * Ritardo 300ms gestito dal provider overlay.
 */
export function useGlobalLoading(message: string | null | undefined): void {
  const claimId = useId();
  useLoadingClaim("overlay", claimId, Boolean(message?.trim()), { message: message?.trim() });
}

/** Sincronizza un singolo slot loading da bridge esterni (es. React Query opt-in). */
export function useGlobalLoadingContextBridge(): (message: string | null) => void {
  const ctx = useContext(LoadingManagerContext);
  const bridgeIdRef = useRef("rq-bridge");
  const activeRef = useRef(false);

  const registerClaim = ctx?.registerClaim;
  const unregisterClaim = ctx?.unregisterClaim;

  return useCallback(
    (message: string | null) => {
      if (!registerClaim || !unregisterClaim) return;
      if (activeRef.current) {
        unregisterClaim("overlay", bridgeIdRef.current);
        activeRef.current = false;
      }
      if (message?.trim()) {
        registerClaim("overlay", bridgeIdRef.current, message.trim());
        activeRef.current = true;
      }
    },
    [registerClaim, unregisterClaim],
  );
}
