"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { clearGestionaleToasts } from "@/context/toast-context";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import { resolveSignInEmail } from "@/src/lib/auth/resolve-sign-in-email";
import { formatLoginIdentifierInput, isValidLoginIdentifier } from "@/src/lib/auth/username";
import { mapDegradedPublicAuthUser, mapSupabaseUserToPublicAuthUser } from "@/src/lib/auth/map-auth-user";
import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";
import { beginUndoSession, resetUndoSession } from "@/lib/gestionale-log/undo-session";
import { flushPendingModificaLogs } from "@/src/services/internal/audit-log";
import { notifyUndoSessionChanged } from "@/lib/gestionale-log/use-undo-session-id";
import { registerGestionaleVisibilityHandler } from "@/lib/ui/gestionale-visibility-coordinator";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";
import { lazyLogBoot, lazyTrackStoreUpdate } from "@/lib/observability/boot-investigation-lazy";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import { invalidateRbacTruthClient } from "@/src/lib/rbac/invalidate-rbac-truth";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import {
  publishAuthRoleHint,
  publishClientEffectivePermissionsSnapshot,
} from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import { invalidateRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";
import { publishStickyRbacSnapshot } from "@/src/lib/rbac/sticky-rbac-snapshot";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";
import { QK } from "@/src/lib/react-query/query-keys";
import { setAuthRememberPreference } from "@/lib/auth/auth-remember-preference";
import { clearInvalidAuthSession } from "@/src/lib/auth/clear-invalid-auth-session";
import {
  isReconcileInFlight,
  reconcileSession,
  type ReconcileReason,
  type ReconcileResult,
} from "@/src/lib/auth/auth-session-coordinator.client";
import { clearRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";
import { clearRicambioStockSnapshotRegistry } from "@/lib/magazzino/ricambio-stock-snapshot-registry";
import { clearStockEntityRegistryForTest } from "@/lib/magazzino/stock-entity-cache";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { fetchRbacRoleKeyForUser } from "@/lib/rbac/fetch-rbac-role-key";
import { authLogsEntry } from "@/lib/domain/auth-logs-entry";
import type { AuthStatus } from "@/src/lib/auth/auth-status";
import type { PublicAuthUser } from "@/src/types/auth-user";

export type { AuthStatus } from "@/src/lib/auth/auth-status";
export { isAuthFullyAuthenticated, isAuthSessionEstablished } from "@/src/lib/auth/auth-status";

type AuthStateValue = {
  status: AuthStatus;
  user: PublicAuthUser | null;
  configurationError: string | null;
  authorName: string;
};

type AuthActionsValue = {
  login: (email: string, password: string, remember: boolean) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
  refresh: (opts?: { force?: boolean }) => Promise<ReconcileResult["verdict"] | null>;
};

type AuthContextValue = AuthStateValue & AuthActionsValue;

type AuthUserIdStore = {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => string | null;
};

const AuthStateContext = createContext<AuthStateValue | null>(null);
const AuthActionsContext = createContext<AuthActionsValue | null>(null);
const AuthUserIdStoreContext = createContext<AuthUserIdStore | null>(null);

const FALLBACK_AUTHOR = "Utente CAB";
const AUTH_INIT_FAILSAFE_MS = 7_000;
/** ponytail: anti refresh-storm — visibility/onAuthChange/gate coalesce */
export const AUTH_REFRESH_DEBOUNCE_MS = 500;

type AuthInvalidSessionSource = ReconcileReason | "login" | "signed_out";

function isServerSnapshotFresh(snapshot: ServerAuthSnapshot | null | undefined): boolean {
  if (!snapshot?.user) return false;
  const exp = snapshot.session.expiresAt;
  if (exp == null) return true;
  return exp * 1000 > Date.now() + 5_000;
}

function deriveInitialAuthState(snapshot: ServerAuthSnapshot | null | undefined): {
  status: AuthStatus;
  user: PublicAuthUser | null;
  configurationError: string | null;
} {
  if (!isSupabasePublicEnvConfigured()) {
    return {
      status: "anonymous",
      user: null,
      configurationError: MISSING_SUPABASE_ENV_MESSAGE,
    };
  }
  if (snapshot?.configurationError) {
    return {
      status: "anonymous",
      user: null,
      configurationError: snapshot.configurationError,
    };
  }
  if (snapshot?.user && isServerSnapshotFresh(snapshot)) {
    return {
      status: "authenticated",
      user: snapshot.user,
      configurationError: null,
    };
  }
  return { status: "loading", user: null, configurationError: null };
}

async function loadPublicUserFromSessionUser(sessionUser: User): Promise<PublicAuthUser> {
  const sb = getBrowserSupabase();
  const [{ data: row, error }, roleKey] = await Promise.all([
    sb
      .from("profiles")
      .select("nome, cognome, username, role_key, cliente_ref, created_at")
      .eq("id", sessionUser.id)
      .maybeSingle(),
    fetchRbacRoleKeyForUser(sb, sessionUser.id),
  ]);
  if (error) {
    console.warn("[auth] profilo non leggibile:", error.message);
  }
  const profile =
    row != null
      ? { ...row, role_key: roleKey }
      : ({ role_key: roleKey } as Parameters<typeof mapSupabaseUserToPublicAuthUser>[1]);
  return mapSupabaseUserToPublicAuthUser(sessionUser, profile);
}

export function AuthProvider({
  children,
  initialSnapshot,
}: {
  children: ReactNode;
  initialSnapshot?: ServerAuthSnapshot | null;
}) {
  const initial = useMemo(() => deriveInitialAuthState(initialSnapshot), [initialSnapshot]);
  const [status, setStatus] = useState<AuthStatus>(initial.status);
  const [user, setUser] = useState<PublicAuthUser | null>(initial.user);
  const [configurationError, setConfigurationError] = useState<string | null>(initial.configurationError);
  const queryClient = useQueryClient();
  const userIdRef = useRef<string | null>(null);
  const userIdListenersRef = useRef(new Set<() => void>());
  const lastStableUserRef = useRef<PublicAuthUser | null>(null);
  const skipInitGetSessionRef = useRef(isServerSnapshotFresh(initialSnapshot));
  const initialSnapshotUserIdRef = useRef(initialSnapshot?.user?.id ?? null);
  const authRestoreStartRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const authRestoreLoggedRef = useRef(skipInitGetSessionRef.current);
  const authInitFailsafeFiredRef = useRef(false);
  const statusRef = useRef<AuthStatus>(initial.status);
  const prevStatusRef = useRef<AuthStatus>(initial.status);
  const reconcileSeqRef = useRef(0);
  const refreshDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTrailingRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const hadEstablishedSessionRef = useRef(Boolean(initialSnapshot?.user?.id));

  useBootInvestigationMount("AuthProvider", {
    initialStatus: initial.status,
    hasSnapshotUser: Boolean(initialSnapshot?.user?.id),
  });

  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    if (prevStatusRef.current === status) return;
    lazyTrackStoreUpdate("auth.status", prevStatusRef.current, status);
    lazyLogBoot("AUTH", "AuthProvider", { from: prevStatusRef.current, to: status }, `${prevStatusRef.current}→${status}`);
    prevStatusRef.current = status;
  }, [status]);

  useLayoutEffect(() => {
    if (!initialSnapshot?.user?.id) return;
    queryClient.setQueryData(
      [...QK.userPermissions, initialSnapshot.user.id] as const,
      initialSnapshot.userPageOverrides ?? [],
    );
    queryClient.setQueryData(
      [...QK.userPermissions, "role-page-access", initialSnapshot.user.id] as const,
      {
        roleKey: initialSnapshot.user.roleKey ?? initialSnapshot.user.ruolo,
        rolePageAccess: initialSnapshot.rolePageAccess ?? {},
      },
    );
    const snap = resolveEffectivePermissions({
      userId: initialSnapshot.user.id,
      roleKey: initialSnapshot.user.roleKey ?? initialSnapshot.user.ruolo,
      rolePageAccess: initialSnapshot.rolePageAccess ?? {},
      userPageOverrideRows: initialSnapshot.userPageOverrides ?? [],
      pilotDbEnabled: false,
      permissionsHydrated: true,
    });
    if (isRbacSnapshotReady(snap)) {
      publishClientEffectivePermissionsSnapshot(snap);
      publishStickyRbacSnapshot(snap);
    }
  }, [initialSnapshot, queryClient]);

  useLayoutEffect(() => {
    if (user?.id && user.ruolo) publishAuthRoleHint(user.id, user.ruolo);
  }, [user?.id, user?.ruolo]);

  useEffect(() => {
    statusRef.current = status;
    const nextUserId = user?.id ?? null;
    if (nextUserId !== userIdRef.current) {
      userIdRef.current = nextUserId;
      userIdListenersRef.current.forEach((listener) => listener());
    }
    if (user && (status === "authenticated" || status === "degraded")) {
      lastStableUserRef.current = user;
      hadEstablishedSessionRef.current = true;
    }
    if (authRestoreLoggedRef.current) return;
    if (status === "loading") return;
    authRestoreLoggedRef.current = true;
    const durationMs = Math.round(performance.now() - authRestoreStartRef.current);
    trackRuntimeEvent(RuntimeEvents.authRestoreDuration, { durationMs });
  }, [user, status]);

  const transitionToAnonymous = useCallback(async () => {
    setUser(null);
    lastStableUserRef.current = null;
    setStatus("anonymous");
    clearRuntimeCabAppSettings();
    clearRicambioStockSnapshotRegistry();
    clearStockEntityRegistryForTest();
    queryClient.clear();
    clearGestionaleToasts();
  }, [queryClient]);

  const applyAuthUser = useCallback(
    async (authUser: User) => {
      try {
        const u = await loadPublicUserFromSessionUser(authUser);
        setUser(u);
        lastStableUserRef.current = u;
        hadEstablishedSessionRef.current = true;
        setStatus("authenticated");
      } catch (e) {
        console.warn("[auth] applicazione sessione fallita (stato degraded):", e);
        const u = mapDegradedPublicAuthUser(authUser);
        setUser(u);
        setStatus("degraded");
      }
    },
    [],
  );

  const applyReconcileVerdict = useCallback(
    async (
      sb: ReturnType<typeof getBrowserSupabase>,
      result: ReconcileResult,
      source: AuthInvalidSessionSource,
    ) => {
      if (isBootInvestigationEnabled()) {
        lazyLogBoot("AUTH", "reconcile_verdict", {
          verdict: result.verdict,
          debugId: result.debugId,
          source,
        });
      }

      switch (result.verdict) {
        case "valid":
          await applyAuthUser(result.user);
          return;
        case "pending":
          return;
        case "invalid":
          trackRuntimeEvent(RuntimeEvents.authSessionInvalid, {
            reason: result.reason.slice(0, 200),
            source,
          });
          await clearInvalidAuthSession(sb);
          await transitionToAnonymous();
          break;
      }
    },
    [applyAuthUser, transitionToAnonymous],
  );

  const runReconcile = useCallback(
    async (reason: ReconcileReason, force?: boolean): Promise<ReconcileResult["verdict"] | null> => {
      if (!isSupabasePublicEnvConfigured()) {
        setConfigurationError(MISSING_SUPABASE_ENV_MESSAGE);
        await transitionToAnonymous();
        return "invalid";
      }
      setConfigurationError(null);

      const mySeq = ++reconcileSeqRef.current;
      const sb = getBrowserSupabase();
      const result = await reconcileSession(sb, { reason, force });

      if (mySeq !== reconcileSeqRef.current) {
        if (isBootInvestigationEnabled()) {
          lazyLogBoot("AUTH", "reconcile_stale", { mySeq, current: reconcileSeqRef.current, debugId: result.debugId });
        }
        return null;
      }

      await applyReconcileVerdict(sb, result, reason);
      return result.verdict;
    },
    [applyReconcileVerdict, transitionToAnonymous],
  );

  const refresh = useCallback(
    async (opts?: { force?: boolean }): Promise<ReconcileResult["verdict"] | null> => {
      const force = opts?.force ?? false;

      if (force) {
        if (refreshDebounceTimerRef.current != null) {
          clearTimeout(refreshDebounceTimerRef.current);
          refreshDebounceTimerRef.current = null;
        }
        refreshTrailingRef.current = false;
        lastRefreshAtRef.current = Date.now();
        return runReconcile("manual", true);
      }

      const now = Date.now();
      const sinceLast = now - lastRefreshAtRef.current;

      if (sinceLast < AUTH_REFRESH_DEBOUNCE_MS) {
        refreshTrailingRef.current = true;
        if (refreshDebounceTimerRef.current == null) {
          refreshDebounceTimerRef.current = setTimeout(() => {
            refreshDebounceTimerRef.current = null;
            if (!refreshTrailingRef.current) return;
            refreshTrailingRef.current = false;
            lastRefreshAtRef.current = Date.now();
            void runReconcile("manual");
          }, AUTH_REFRESH_DEBOUNCE_MS - sinceLast);
        }
        return null;
      }

      lastRefreshAtRef.current = now;
      return runReconcile("manual");
    },
    [runReconcile],
  );

  useEffect(() => {
    if (status !== "loading") {
      authInitFailsafeFiredRef.current = false;
      return;
    }
    if (!isSupabasePublicEnvConfigured()) return;

    const id = window.setTimeout(() => {
      if (authInitFailsafeFiredRef.current) return;
      authInitFailsafeFiredRef.current = true;
      console.warn("[auth] init timeout — reconcile forzata");
      void runReconcile("failsafe", true);
    }, AUTH_INIT_FAILSAFE_MS);

    return () => window.clearTimeout(id);
  }, [status, runReconcile]);

  useEffect(() => {
    if (!isSupabasePublicEnvConfigured()) return;

    return registerGestionaleVisibilityHandler(() => {
      const currentStatus = statusRef.current;
      if (currentStatus !== "authenticated" && currentStatus !== "degraded") return;
      if (isBootInvestigationEnabled()) {
        lazyLogBoot("AUTH", "visibility_refresh", { status: currentStatus });
      }
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    if (!isSupabasePublicEnvConfigured()) {
      setConfigurationError(MISSING_SUPABASE_ENV_MESSAGE);
      void transitionToAnonymous();
      return () => {
        cancelled = true;
      };
    }

    setConfigurationError(null);

    void (async () => {
      try {
        const sb = getBrowserSupabase();

        const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
          if (cancelled) return;
          if (isBootInvestigationEnabled()) {
            lazyLogBoot("AUTH", "onAuthStateChange", { event, hasSession: Boolean(session?.user?.id) });
          }

          if (event === "SIGNED_OUT") {
            resetUndoSession();
            notifyUndoSessionChanged();
            void transitionToAnonymous();
            return;
          }

          if (event === "TOKEN_REFRESHED") {
            if (session?.user?.id && session.user.id === userIdRef.current) return;
            if (!session) {
              void refresh();
            }
            return;
          }

          if (event === "INITIAL_SESSION") {
            if (session?.user?.id && session.user.id === initialSnapshotUserIdRef.current) {
              return;
            }
            if (!session?.user) {
              const trustServer =
                isServerSnapshotFresh(initialSnapshot) || isReconcileInFlight();
              if (trustServer) return;
              void refresh({ force: true });
            }
            return;
          }

          if (event === "SIGNED_IN" && session?.user) {
            const onResetPassword =
              typeof window !== "undefined" && window.location.pathname.startsWith("/login/reset-password");
            if (!onResetPassword) {
              authLogsEntry.logLoginFireAndForget(session.user.id, session.user.email ?? "");
              beginUndoSession();
              notifyUndoSessionChanged();
            }
            void applyAuthUser(session.user);
            return;
          }

          if (event === "USER_UPDATED" && session?.user) {
            void applyAuthUser(session.user);
          }
        });
        subscription = sub.subscription;

        if (!skipInitGetSessionRef.current) {
          if (cancelled) return;
          await runReconcile("init", true);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "";
          setConfigurationError(msg === MISSING_SUPABASE_ENV_MESSAGE ? msg : null);
          if (initialSnapshot?.user) {
            void refresh({ force: true });
          } else {
            await transitionToAnonymous();
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
      if (refreshDebounceTimerRef.current != null) {
        clearTimeout(refreshDebounceTimerRef.current);
        refreshDebounceTimerRef.current = null;
      }
    };
  }, [
    applyAuthUser,
    initialSnapshot,
    refresh,
    runReconcile,
    transitionToAnonymous,
  ]);

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      if (!isSupabasePublicEnvConfigured()) {
        setConfigurationError(MISSING_SUPABASE_ENV_MESSAGE);
        return { ok: false as const, message: MISSING_SUPABASE_ENV_MESSAGE };
      }
      setConfigurationError(null);
      try {
        const identifier = formatLoginIdentifierInput(email);
        if (!isValidLoginIdentifier(identifier)) {
          return {
            ok: false as const,
            message: "Accesso non riuscito. Verifica email o nome utente e password.",
          };
        }
        setAuthRememberPreference(remember);
        const sb = getBrowserSupabase();
        const signInEmail = await resolveSignInEmail(sb, identifier);
        if (!signInEmail) {
          authLogsEntry.logLoginFailedFireAndForget(identifier.includes("@") ? identifier : `${identifier}@login`);
          return {
            ok: false as const,
            message: "Accesso non riuscito. Verifica email o nome utente e password.",
          };
        }
        const { error } = await sb.auth.signInWithPassword({
          email: signInEmail,
          password,
        });
        if (error) {
          authLogsEntry.logLoginFailedFireAndForget(signInEmail);
          trackRuntimeEvent(RuntimeEvents.authLoginFailed, { reason: (error.message || "sign_in").slice(0, 200) });
          return { ok: false as const, message: error.message || "Accesso negato." };
        }

        const mySeq = ++reconcileSeqRef.current;
        const result = await reconcileSession(sb, { reason: "manual", force: true });
        if (mySeq !== reconcileSeqRef.current) {
          return { ok: false as const, message: "Accesso in corso, riprova." };
        }
        if (result.verdict !== "valid") {
          authLogsEntry.logLoginFailedFireAndForget(signInEmail);
          if (result.verdict === "invalid") {
            await applyReconcileVerdict(sb, result, "login");
          }
          return {
            ok: false as const,
            message: result.verdict === "pending" ? "Sessione non disponibile. Riprova." : "Accesso non riuscito. Riprova.",
          };
        }

        await applyAuthUser(result.user);
        beginUndoSession();
        notifyUndoSessionChanged();
        await invalidateRuntimeTruth({
          reason: "sessionEstablished",
          queryClient,
        });
        trackRuntimeEvent(RuntimeEvents.authLoginSuccess, { userId: result.user.id });
        return { ok: true as const };
      } catch (e) {
        const msg =
          e instanceof Error && e.message === MISSING_SUPABASE_ENV_MESSAGE
            ? MISSING_SUPABASE_ENV_MESSAGE
            : e instanceof Error
              ? e.message
              : "Errore di accesso.";
        authLogsEntry.logLoginFailedFireAndForget(email.trim().toLowerCase());
        trackRuntimeEvent(RuntimeEvents.authLoginFailed, { reason: msg.slice(0, 200) });
        return { ok: false as const, message: msg };
      }
    },
    [applyAuthUser, applyReconcileVerdict, queryClient],
  );

  const logout = useCallback(async () => {
    const uid = user?.id;
    const email = user?.email ?? "";
    if (isSupabasePublicEnvConfigured()) {
      try {
        const sb = getBrowserSupabase();
        await flushPendingModificaLogs(sb);
        if (uid) {
          authLogsEntry.logLogoutFireAndForget(uid, email);
        }
        await sb.auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }
    }
    trackRuntimeEvent(RuntimeEvents.authLogout, { userId: uid ?? "anon" });
    await invalidateRbacTruthClient({ reason: "logout", queryClient });
    await transitionToAnonymous();
    resetUndoSession();
    notifyUndoSessionChanged();
  }, [queryClient, transitionToAnonymous, user?.email, user?.id]);

  const authorName = useMemo(() => {
    const n = user?.nome?.trim();
    return n || FALLBACK_AUTHOR;
  }, [user]);

  const userIdStore = useMemo<AuthUserIdStore>(
    () => ({
      getSnapshot: () => userIdRef.current,
      subscribe: (onStoreChange) => {
        userIdListenersRef.current.add(onStoreChange);
        return () => {
          userIdListenersRef.current.delete(onStoreChange);
        };
      },
    }),
    [],
  );

  const stateValue = useMemo<AuthStateValue>(
    () => ({
      status,
      user,
      configurationError,
      authorName,
    }),
    [status, user, configurationError, authorName],
  );

  const actionsValue = useMemo<AuthActionsValue>(
    () => ({
      login,
      logout,
      refresh,
    }),
    [login, logout, refresh],
  );

  return (
    <AuthUserIdStoreContext.Provider value={userIdStore}>
      <AuthStateContext.Provider value={stateValue}>
        <AuthActionsContext.Provider value={actionsValue}>{children}</AuthActionsContext.Provider>
      </AuthStateContext.Provider>
    </AuthUserIdStoreContext.Provider>
  );
}

export function useAuthState(): AuthStateValue {
  const ctx = useContext(AuthStateContext);
  if (!ctx) throw new Error("useAuthState deve essere usato dentro AuthProvider");
  return ctx;
}

export function useAuthActions(): AuthActionsValue {
  const ctx = useContext(AuthActionsContext);
  if (!ctx) throw new Error("useAuthActions deve essere usato dentro AuthProvider");
  return ctx;
}

export function useAuth(): AuthContextValue {
  return { ...useAuthState(), ...useAuthActions() };
}

/** Id utente per prefs UI locali — null se fuori provider o non autenticato. */
export function useAuthUserId(): string | null {
  const store = useContext(AuthUserIdStoreContext);
  return useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    () => store?.getSnapshot() ?? null,
    () => null,
  );
}
