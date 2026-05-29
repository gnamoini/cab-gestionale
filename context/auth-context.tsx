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
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { clearGestionaleToasts } from "@/context/toast-context";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import { resolveSignInEmail } from "@/src/lib/auth/resolve-sign-in-email";
import { formatLoginIdentifierInput, isValidLoginIdentifier } from "@/src/lib/auth/username";
import { isTransientNetworkAuthError, shouldClearSessionOnAuthError } from "@/src/lib/auth/auth-network-retry";
import { mapDegradedPublicAuthUser, mapSupabaseUserToPublicAuthUser } from "@/src/lib/auth/map-auth-user";
import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";
import { beginUndoSession, resetUndoSession } from "@/lib/gestionale-log/undo-session";
import { notifyUndoSessionChanged } from "@/lib/gestionale-log/use-undo-session-id";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { invalidateRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";
import { QK } from "@/src/lib/react-query/query-keys";
import { clearInvalidAuthSession } from "@/src/lib/auth/clear-invalid-auth-session";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { authLogsService } from "@/src/services/auth-logs.service";
import type { AuthStatus } from "@/src/lib/auth/auth-status";
import type { PublicAuthUser } from "@/src/types/auth-user";

export type { AuthStatus } from "@/src/lib/auth/auth-status";
export { isAuthFullyAuthenticated, isAuthSessionEstablished } from "@/src/lib/auth/auth-status";

type AuthContextValue = {
  status: AuthStatus;
  user: PublicAuthUser | null;
  configurationError: string | null;
  authorName: string;
  login: (email: string, password: string, remember: boolean) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const FALLBACK_AUTHOR = "Utente CAB";
const AUTH_INIT_FAILSAFE_MS = 7_000;

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

async function getSessionWithSoftRetry(sb: ReturnType<typeof getBrowserSupabase>): Promise<{
  data: { session: Session | null };
  error: AuthError | null;
}> {
  const first = await sb.auth.getSession();
  if (!first.error) return first;
  if (!isTransientNetworkAuthError(first.error)) return first;
  console.warn("[auth] getSession errore transitorio, retry una volta:", first.error.message);
  await new Promise((r) => setTimeout(r, 300));
  return sb.auth.getSession();
}

async function loadPublicUserFromSessionUser(sessionUser: User): Promise<PublicAuthUser> {
  const sb = getBrowserSupabase();
  const { data: row, error } = await sb.from("profiles").select("nome, ruolo").eq("id", sessionUser.id).maybeSingle();
  if (error) {
    console.warn("[auth] profilo non leggibile:", error.message);
  }
  return mapSupabaseUserToPublicAuthUser(sessionUser, row);
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
  const lastStableUserRef = useRef<PublicAuthUser | null>(null);
  const clearingSessionRef = useRef(false);
  const skipInitGetSessionRef = useRef(isServerSnapshotFresh(initialSnapshot));
  const authRestoreStartRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const authRestoreLoggedRef = useRef(skipInitGetSessionRef.current);
  const authInitFailsafeFiredRef = useRef(false);

  useLayoutEffect(() => {
    if (!initialSnapshot?.user?.id) return;
    queryClient.setQueryData(
      [...QK.userPermissions, initialSnapshot.user.id] as const,
      initialSnapshot.permissions ?? [],
    );
  }, [initialSnapshot, queryClient]);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
    if (user && (status === "authenticated" || status === "degraded")) lastStableUserRef.current = user;
    if (authRestoreLoggedRef.current) return;
    if (status === "loading") return;
    authRestoreLoggedRef.current = true;
    const durationMs = Math.round(performance.now() - authRestoreStartRef.current);
    trackRuntimeEvent(RuntimeEvents.authRestoreDuration, { durationMs });
  }, [user, status]);

  const applyAuthUser = useCallback(
    async (authUser: User | null) => {
      if (!authUser) {
        setUser(null);
        lastStableUserRef.current = null;
        setStatus("anonymous");
        queryClient.clear();
        clearGestionaleToasts();
        return;
      }
      try {
        const u = await loadPublicUserFromSessionUser(authUser);
        setUser(u);
        lastStableUserRef.current = u;
        setStatus("authenticated");
      } catch (e) {
        console.warn("[auth] applicazione sessione fallita (stato degraded):", e);
        const u = mapDegradedPublicAuthUser(authUser);
        setUser(u);
        setStatus("degraded");
      }
    },
    [queryClient],
  );

  const applySession = useCallback(
    async (session: Session | null) => {
      await applyAuthUser(session?.user ?? null);
    },
    [applyAuthUser],
  );

  const handleInvalidSession = useCallback(
    async (sb: ReturnType<typeof getBrowserSupabase>, reason: string) => {
      if (clearingSessionRef.current) {
        await applySession(null);
        return;
      }
      clearingSessionRef.current = true;
      try {
        trackRuntimeEvent(RuntimeEvents.authSessionInvalid, { reason: reason.slice(0, 200) });
        await clearInvalidAuthSession(sb);
        await applySession(null);
      } finally {
        clearingSessionRef.current = false;
      }
    },
    [applySession],
  );

  const refresh = useCallback(async () => {
    if (!isSupabasePublicEnvConfigured()) {
      setConfigurationError(MISSING_SUPABASE_ENV_MESSAGE);
      setUser(null);
      setStatus("anonymous");
      return;
    }
    setConfigurationError(null);
    try {
      const sb = getBrowserSupabase();
      const { data, error } = await getSessionWithSoftRetry(sb);
      const session = data?.session ?? null;

      if (error && shouldClearSessionOnAuthError(error)) {
        await handleInvalidSession(sb, error.message);
        return;
      }
      if (error && isTransientNetworkAuthError(error)) {
        console.warn("[auth] refresh: errore rete dopo retry, stato degraded:", error.message);
        if (lastStableUserRef.current) {
          setUser(lastStableUserRef.current);
          setStatus("degraded");
        }
        return;
      }
      if (error) {
        console.warn("[auth] refresh: getSession:", error.message);
        if (lastStableUserRef.current) {
          setUser(lastStableUserRef.current);
          setStatus("degraded");
        }
        return;
      }
      await applySession(session);
    } catch (e) {
      console.warn("[auth] refresh eccezione:", e);
      if (lastStableUserRef.current) {
        setUser(lastStableUserRef.current);
        setStatus("degraded");
      }
    }
  }, [applySession, handleInvalidSession]);

  useEffect(() => {
    if (status !== "loading") {
      authInitFailsafeFiredRef.current = false;
      return;
    }
    if (!isSupabasePublicEnvConfigured()) return;

    const id = window.setTimeout(() => {
      if (authInitFailsafeFiredRef.current) return;
      authInitFailsafeFiredRef.current = true;
      console.warn("[auth] init timeout — degradazione o logout");
      if (initialSnapshot?.user) {
        setUser(initialSnapshot.user);
        setStatus("degraded");
        return;
      }
      if (lastStableUserRef.current) {
        setUser(lastStableUserRef.current);
        setStatus("degraded");
        return;
      }
      setUser(null);
      setStatus("anonymous");
      void refresh();
    }, AUTH_INIT_FAILSAFE_MS);

    return () => window.clearTimeout(id);
  }, [status, initialSnapshot?.user, refresh]);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    if (!isSupabasePublicEnvConfigured()) {
      setConfigurationError(MISSING_SUPABASE_ENV_MESSAGE);
      setUser(null);
      setStatus("anonymous");
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
          if (event === "TOKEN_REFRESHED" && !session) {
            void handleInvalidSession(sb, "TOKEN_REFRESHED senza sessione");
            return;
          }
          if (event === "TOKEN_REFRESHED" && session?.user?.id && session.user.id === userIdRef.current) {
            return;
          }
          if (event === "SIGNED_IN" && session?.user) {
            authLogsService.logLoginFireAndForget(session.user.id, session.user.email ?? "");
            beginUndoSession();
            notifyUndoSessionChanged();
          }
          if (event === "SIGNED_OUT") {
            resetUndoSession();
            notifyUndoSessionChanged();
          }
          void applySession(session);
        });
        subscription = sub.subscription;

        if (!skipInitGetSessionRef.current) {
          const { data: init, error: initErr } = await getSessionWithSoftRetry(sb);
          const session = init?.session ?? null;

          if (cancelled) return;

          if (initErr && shouldClearSessionOnAuthError(initErr)) {
            await handleInvalidSession(sb, initErr.message);
          } else if (initErr && session?.user && isTransientNetworkAuthError(initErr)) {
            await applySession(session);
            setStatus("degraded");
          } else if (initErr) {
            console.warn("[auth] init getSession:", initErr.message);
            if (session?.user) await applySession(session);
            else {
              setUser(null);
              setStatus("anonymous");
            }
          } else {
            await applySession(session);
          }
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "";
          setConfigurationError(msg === MISSING_SUPABASE_ENV_MESSAGE ? msg : null);
          setUser(null);
          setStatus("anonymous");
        }
      }
    })();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [applySession, handleInvalidSession]);

  const login = useCallback(
    async (email: string, password: string, _remember: boolean) => {
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
        const sb = getBrowserSupabase();
        const signInEmail = await resolveSignInEmail(sb, identifier);
        if (!signInEmail) {
          authLogsService.logLoginFailedFireAndForget(identifier.includes("@") ? identifier : `${identifier}@login`);
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
          authLogsService.logLoginFailedFireAndForget(signInEmail);
          trackRuntimeEvent(RuntimeEvents.authLoginFailed, { reason: (error.message || "sign_in").slice(0, 200) });
          return { ok: false as const, message: error.message || "Accesso negato." };
        }
        const { data: sessWrap, error: sessErr } = await getSessionWithSoftRetry(sb);
        const session = sessWrap?.session ?? null;
        if (sessErr && shouldClearSessionOnAuthError(sessErr)) {
          authLogsService.logLoginFailedFireAndForget(signInEmail);
          await handleInvalidSession(sb, sessErr.message);
          return { ok: false as const, message: "Accesso non riuscito. Riprova." };
        }
        if (!session?.user) {
          authLogsService.logLoginFailedFireAndForget(signInEmail);
          console.warn("[auth] login: nessuna sessione dopo signInWithPassword", sessErr?.message);
          return {
            ok: false as const,
            message: sessErr?.message || "Sessione non disponibile. Riprova.",
          };
        }
        await applyAuthUser(session.user);
        beginUndoSession();
        notifyUndoSessionChanged();
        await invalidateRuntimeTruth({
          reason: "sessionEstablished",
          queryClient,
        });
        trackRuntimeEvent(RuntimeEvents.authLoginSuccess, { userId: session.user.id });
        return { ok: true as const };
      } catch (e) {
        const msg =
          e instanceof Error && e.message === MISSING_SUPABASE_ENV_MESSAGE
            ? MISSING_SUPABASE_ENV_MESSAGE
            : e instanceof Error
              ? e.message
              : "Errore di accesso.";
        authLogsService.logLoginFailedFireAndForget(email.trim().toLowerCase());
        trackRuntimeEvent(RuntimeEvents.authLoginFailed, { reason: msg.slice(0, 200) });
        return { ok: false as const, message: msg };
      }
    },
    [applyAuthUser, handleInvalidSession, queryClient],
  );

  const logout = useCallback(async () => {
    const uid = user?.id;
    const email = user?.email ?? "";
    if (isSupabasePublicEnvConfigured()) {
      try {
        const sb = getBrowserSupabase();
        if (uid) {
          authLogsService.logLogoutFireAndForget(uid, email);
        }
        await sb.auth.signOut();
      } catch {
        /* ignore */
      }
    }
    trackRuntimeEvent(RuntimeEvents.authLogout, { userId: uid ?? "anon" });
    await invalidateRuntimeTruth({ reason: "logout", queryClient });
    setUser(null);
    lastStableUserRef.current = null;
    setStatus("anonymous");
    queryClient.clear();
    clearGestionaleToasts();
    resetUndoSession();
    notifyUndoSessionChanged();
  }, [queryClient, user?.email, user?.id]);

  const authorName = useMemo(() => {
    const n = user?.nome?.trim();
    return n || FALLBACK_AUTHOR;
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      configurationError,
      authorName,
      login,
      logout,
      refresh,
    }),
    [status, user, configurationError, authorName, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve essere usato dentro AuthProvider");
  return ctx;
}
