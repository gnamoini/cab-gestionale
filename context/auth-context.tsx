"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import { resolveSignInEmail } from "@/src/lib/auth/resolve-sign-in-email";
import { formatLoginIdentifierInput, isValidLoginIdentifier } from "@/src/lib/auth/username";
import { resolveFormattedUserDisplayName } from "@/src/lib/auth/resolve-user-display-name";
import { resolveRole } from "@/lib/auth/rbac";
import { beginUndoSession, resetUndoSession } from "@/lib/gestionale-log/undo-session";
import { notifyUndoSessionChanged } from "@/lib/gestionale-log/use-undo-session-id";
import { QK } from "@/src/lib/react-query/query-keys";
import { clearInvalidAuthSession, isInvalidRefreshAuthMessage } from "@/src/lib/auth/clear-invalid-auth-session";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { authLogsService } from "@/src/services/auth-logs.service";
import type { AuthStatus } from "@/src/lib/auth/auth-status";
import type { PublicAuthUser } from "@/src/types/auth-user";
import type { RuoloUtente } from "@/src/types/supabase-tables";

export type { AuthStatus } from "@/src/lib/auth/auth-status";
export { isAuthFullyAuthenticated, isAuthSessionEstablished } from "@/src/lib/auth/auth-status";

type AuthContextValue = {
  status: AuthStatus;
  user: PublicAuthUser | null;
  /** Se valorizzato, il client Supabase non è inizializzato (mancano env pubbliche). */
  configurationError: string | null;
  /** Nome da usare nei log (mai stringa vuota). */
  authorName: string;
  login: (email: string, password: string, remember: boolean) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const FALLBACK_AUTHOR = "Utente CAB";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientNetworkAuthError(err: AuthError | Error): boolean {
  const m = `${err.name} ${err.message}`.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("timeout") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504")
  );
}

function shouldClearSessionOnAuthError(err: AuthError | Error): boolean {
  return isInvalidRefreshAuthMessage(err.message);
}

async function getSessionWithSoftRetry(sb: ReturnType<typeof getBrowserSupabase>): Promise<{
  data: { session: Session | null };
  error: AuthError | null;
}> {
  const first = await sb.auth.getSession();
  if (!first.error) return first;
  if (!isTransientNetworkAuthError(first.error)) return first;
  console.warn("[auth] getSession errore transitorio, retry una volta:", first.error.message);
  await delay(450);
  return sb.auth.getSession();
}

async function loadPublicUserFromSessionUser(sessionUser: User): Promise<PublicAuthUser> {
  const sb = getBrowserSupabase();
  const { data: row, error } = await sb.from("profiles").select("nome, ruolo").eq("id", sessionUser.id).maybeSingle();
  if (error) {
    console.warn("[auth] profilo non leggibile:", error.message);
  }
  const nome = resolveFormattedUserDisplayName({
    email: sessionUser.email,
    profileNome: row?.nome,
    userMetadata: { ...sessionUser.app_metadata, ...sessionUser.user_metadata },
  });
  const ruoloFromProfile = typeof row?.ruolo === "string" ? row.ruolo : null;
  /** Sicurezza: ruolo SOLO da DB (`profiles`). Mai da JWT metadata (escalation). */
  const ruolo = resolveRole(ruoloFromProfile) as RuoloUtente;
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    nome,
    ruolo,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<PublicAuthUser | null>(null);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const userIdRef = useRef<string | null>(null);
  const lastStableUserRef = useRef<PublicAuthUser | null>(null);
  const clearingSessionRef = useRef(false);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
    if (user && (status === "authenticated" || status === "degraded")) lastStableUserRef.current = user;
  }, [user, status]);

  const applyAuthUser = useCallback(
    async (authUser: User | null) => {
      if (!authUser) {
        setUser(null);
        lastStableUserRef.current = null;
        setStatus("anonymous");
        void queryClient.invalidateQueries({ queryKey: [...QK.userPermissions] });
        return;
      }
      try {
        const u = await loadPublicUserFromSessionUser(authUser);
        setUser(u);
        lastStableUserRef.current = u;
        setStatus("authenticated");
      } catch (e) {
        console.warn("[auth] applicazione sessione fallita (stato degraded):", e);
        const nome = resolveFormattedUserDisplayName({
          email: authUser.email,
          userMetadata: { ...authUser.app_metadata, ...authUser.user_metadata },
        });
        setUser({
          id: authUser.id,
          email: authUser.email ?? "",
          nome,
          ruolo: "guest",
        });
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
        console.warn("[auth] sessione non valida, clear:", reason);
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
        void queryClient.invalidateQueries({ queryKey: [...QK.userPermissions] });
        return { ok: true as const };
      } catch (e) {
        const msg =
          e instanceof Error && e.message === MISSING_SUPABASE_ENV_MESSAGE
            ? MISSING_SUPABASE_ENV_MESSAGE
            : e instanceof Error
              ? e.message
              : "Errore di accesso.";
        authLogsService.logLoginFailedFireAndForget(email.trim().toLowerCase());
        return { ok: false as const, message: msg };
      }
    },
    [applyAuthUser, handleInvalidSession, queryClient],
  );

  const logout = useCallback(async () => {
    if (isSupabasePublicEnvConfigured()) {
      try {
        const sb = getBrowserSupabase();
        const { data: gu, error: guErr } = await sb.auth.getUser();
        if (guErr) {
          console.warn("[auth] getUser (logout):", guErr.message);
        } else if (gu.user?.id) {
          authLogsService.logLogoutFireAndForget(gu.user.id, gu.user.email ?? "");
        }
        await sb.auth.signOut();
      } catch {
        /* ignore */
      }
    }
    setUser(null);
    lastStableUserRef.current = null;
    setStatus("anonymous");
    resetUndoSession();
    notifyUndoSessionChanged();
    void queryClient.invalidateQueries({ queryKey: [...QK.userPermissions] });
  }, [queryClient]);

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
