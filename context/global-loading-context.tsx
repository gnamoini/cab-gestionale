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
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { GlobalLoadingOverlay } from "@/components/design-system/loading";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";
import { lazyTrackStoreUpdate } from "@/lib/observability/boot-investigation-lazy";
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
};

const LoadingManagerContext = createContext<LoadingManagerContextValue | null>(null);
const LoadingClaimsRefContext = createContext<RefObject<Map<string, LoadingClaimRecord>> | null>(null);
const LoadingClaimsSubscribeContext = createContext<((onStoreChange: () => void) => () => void) | null>(null);

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
  const [winningSurface, setWinningSurface] = useState<LoadingSurface | null>(null);
  const [message, setMessage] = useState<string>(GLOBAL_LOADING_MESSAGES.default);
  const claimsRef = useRef<Map<string, LoadingClaimRecord>>(new Map());
  const claimListenersRef = useRef(new Set<() => void>());
  const idRef = useRef(0);
  const pushClaimIdRef = useRef(0);

  const notifyClaimListeners = useCallback(() => {
    claimListenersRef.current.forEach((listener) => listener());
  }, []);

  const syncDerivedFromClaims = useCallback(() => {
    const claimList = [...claimsRef.current.values()];
    setWinningSurface(resolveWinningSurface(claimList));
    setMessage(resolveOverlayMessage(claimList, GLOBAL_LOADING_MESSAGES.default));
    notifyClaimListeners();
  }, [notifyClaimListeners]);

  const subscribeClaims = useCallback((onStoreChange: () => void) => {
    claimListenersRef.current.add(onStoreChange);
    return () => {
      claimListenersRef.current.delete(onStoreChange);
    };
  }, []);

  const push = useCallback(
    (pushMessage: string) => {
      const stackId = ++idRef.current;
      const claimId = `push:${++pushClaimIdRef.current}`;
      const normalized = pushMessage.trim() || GLOBAL_LOADING_MESSAGES.default;
      setStack((s) => [...s, { id: stackId, message: normalized }]);
      claimsRef.current.set(claimKey("overlay", claimId), {
        surface: "overlay",
        id: claimId,
        message: normalized,
      });
      syncDerivedFromClaims();
      return () => {
        setStack((s) => s.filter((e) => e.id !== stackId));
        claimsRef.current.delete(claimKey("overlay", claimId));
        syncDerivedFromClaims();
      };
    },
    [syncDerivedFromClaims],
  );

  const setTopMessage = useCallback(
    (pushMessage: string) => {
      const normalized = pushMessage.trim() || GLOBAL_LOADING_MESSAGES.default;
      setStack((s) => {
        if (s.length === 0) return s;
        const next = [...s];
        next[next.length - 1] = { ...next[next.length - 1]!, message: normalized };
        return next;
      });
      const overlayClaims = [...claimsRef.current.values()].filter((c) => c.surface === "overlay");
      const last = overlayClaims[overlayClaims.length - 1];
      if (!last) return;
      claimsRef.current.set(claimKey("overlay", last.id), { ...last, message: normalized });
      syncDerivedFromClaims();
    },
    [syncDerivedFromClaims],
  );

  const registerClaim = useCallback(
    (surface: LoadingSurface, id: string, claimMessage?: string) => {
      claimsRef.current.set(claimKey(surface, id), {
        surface,
        id,
        message: claimMessage?.trim() || undefined,
      });
      syncDerivedFromClaims();
    },
    [syncDerivedFromClaims],
  );

  const unregisterClaim = useCallback(
    (surface: LoadingSurface, id: string) => {
      const key = claimKey(surface, id);
      if (!claimsRef.current.has(key)) return;
      claimsRef.current.delete(key);
      syncDerivedFromClaims();
    },
    [syncDerivedFromClaims],
  );

  const overlayActive = winningSurface === "overlay";
  const overlayVisible = useDelayedActive(overlayActive);

  const stackActive = stack.length > 0;
  const prevActiveRef = useRef(overlayActive);
  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    if (prevActiveRef.current === overlayActive) return;
    lazyTrackStoreUpdate("globalLoading", prevActiveRef.current, overlayActive, {
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
    }),
    [message, stackActive, overlayActive, push, setTopMessage, winningSurface, registerClaim, unregisterClaim],
  );

  return (
    <LoadingClaimsSubscribeContext.Provider value={subscribeClaims}>
      <LoadingClaimsRefContext.Provider value={claimsRef}>
        <LoadingManagerContext.Provider value={value}>
          {children}
          <GlobalLoadingOverlay visible={overlayVisible} message={message} />
        </LoadingManagerContext.Provider>
      </LoadingClaimsRefContext.Provider>
    </LoadingClaimsSubscribeContext.Provider>
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
  const claimMessage = opts?.message;
  const registerClaim = ctx?.registerClaim;
  const unregisterClaim = ctx?.unregisterClaim;

  useEffect(() => {
    if (!registerClaim || !unregisterClaim || !active) return;
    registerClaim(surface, id, claimMessage);
    return () => unregisterClaim(surface, id);
  }, [registerClaim, unregisterClaim, surface, id, active, claimMessage]);
}

/** true se la surface vince la competizione globale. */
export function useLoadingSurfaceActive(surface: LoadingSurface): boolean {
  const ctx = useContext(LoadingManagerContext);
  return isSurfaceActive(ctx?.winningSurface ?? null, surface);
}

/** true se questo claim specifico è attivo e la sua surface vince. */
export function useIsWinningClaim(surface: LoadingSurface, id: string, active: boolean): boolean {
  const ctx = useContext(LoadingManagerContext);
  const claimsRef = useContext(LoadingClaimsRefContext);
  const subscribeClaims = useContext(LoadingClaimsSubscribeContext);
  const winningSurface = ctx?.winningSurface ?? null;

  const claimPresent = useSyncExternalStore(
    subscribeClaims ?? (() => () => {}),
    () => claimsRef?.current.has(claimKey(surface, id)) ?? false,
    () => false,
  );

  if (!active) return false;
  return isClaimWinning(winningSurface, claimsRef?.current ?? new Map(), surface, id) && claimPresent;
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
    (bridgeMessage: string | null) => {
      if (!registerClaim || !unregisterClaim) return;
      if (activeRef.current) {
        unregisterClaim("overlay", bridgeIdRef.current);
        activeRef.current = false;
      }
      if (bridgeMessage?.trim()) {
        registerClaim("overlay", bridgeIdRef.current, bridgeMessage.trim());
        activeRef.current = true;
      }
    },
    [registerClaim, unregisterClaim],
  );
}
