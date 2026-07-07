import { isUserBanned } from "@/lib/auth/user-ban-state";
import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE, readSupabasePublicEnv } from "@/lib/env/supabase-public";
import {
  shouldClearSessionOnAuthError,
  isTransientNetworkAuthError,
  isRecoverableAuthError,
} from "@/src/lib/auth/auth-network-retry";
import { mapDegradedPublicAuthUser, mapSupabaseUserToPublicAuthUser } from "@/src/lib/auth/map-auth-user";
import {
  cookieFingerprintFromList,
  dedupeServerAuthFetch,
  emptyAuthSnapshot,
  readCachedServerAuthSnapshot,
  writeCachedServerAuthSnapshot,
} from "@/src/lib/auth/server-session-cache";
import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";
import { readProxyForwardedAuthSnapshot } from "@/src/lib/auth/proxy-auth-snapshot-header";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { loadRolePageAccess, loadUserPageOverrides } from "@/src/lib/rbac/load-rbac-data";
import { fetchRbacRoleKeyForUser } from "@/lib/rbac/fetch-rbac-role-key";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";

type CookieLike = { name: string; value: string };

async function getUserWithNetworkRetry(supabase: SupabaseClient) {
  const first = await supabase.auth.getUser();
  if (!first.error && first.data?.user) return first;
  if (first.error && shouldClearSessionOnAuthError(first.error)) return first;

  if (first.error && isRecoverableAuthError(first.error)) {
    await supabase.auth.refreshSession();
    const afterRefresh = await supabase.auth.getUser();
    if (!afterRefresh.error && afterRefresh.data?.user) return afterRefresh;
    if (afterRefresh.error && shouldClearSessionOnAuthError(afterRefresh.error)) return afterRefresh;
    if (afterRefresh.error && isTransientNetworkAuthError(afterRefresh.error)) {
      await new Promise((r) => setTimeout(r, 300));
      return supabase.auth.getUser();
    }
    return afterRefresh;
  }

  if (first.error && isTransientNetworkAuthError(first.error)) {
    await new Promise((r) => setTimeout(r, 300));
    return supabase.auth.getUser();
  }
  return first;
}

function shouldWriteEmptySnapshotToCache(authError: AuthError | Error | null): boolean {
  if (!authError) return true;
  if (shouldClearSessionOnAuthError(authError)) return true;
  return false;
}

async function fetchServerAuthSnapshotWithClient(
  supabase: SupabaseClient,
  fingerprint: string,
): Promise<ServerAuthSnapshot> {
  const { data: authData, error: authError } = await getUserWithNetworkRetry(supabase);

  if (authError && shouldClearSessionOnAuthError(authError)) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    const snap = emptyAuthSnapshot();
    writeCachedServerAuthSnapshot(fingerprint, snap);
    return snap;
  }

  const authUser = authData?.user ?? null;
  if (!authUser) {
    const snap = emptyAuthSnapshot();
    if (shouldWriteEmptySnapshotToCache(authError)) {
      writeCachedServerAuthSnapshot(fingerprint, snap);
    }
    return snap;
  }

  if (isUserBanned(authUser)) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    const snap = emptyAuthSnapshot();
    writeCachedServerAuthSnapshot(fingerprint, snap);
    return snap;
  }

  const { data: sessionWrap } = await supabase.auth.getSession();
  const expiresAt =
    sessionWrap.session?.expires_at != null ? Math.floor(sessionWrap.session.expires_at) : null;

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("nome, cognome, username, role_key, cliente_ref, created_at")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profErr) {
    console.warn("[auth] server snapshot profilo non leggibile:", profErr.message);
  }

  const roleKey = await fetchRbacRoleKeyForUser(supabase, authUser.id);
  let rolePageAccess: Record<string, PageAccessLevel> = {};
  let userPageOverridesMap: Record<string, PageAccessLevel> = {};
  try {
    [rolePageAccess, userPageOverridesMap] = await Promise.all([
      loadRolePageAccess(supabase, roleKey),
      loadUserPageOverrides(supabase, authUser.id),
    ]);
  } catch (e) {
    console.warn("[auth] role page access / overrides load failed:", e);
  }

  const userPageOverrides = Object.entries(userPageOverridesMap).map(([page_key, access_level]) => ({
    page_key,
    access_level,
  }));

  let publicUser;
  try {
    const profileForMap =
      prof != null ? { ...prof, role_key: roleKey } : ({ role_key: roleKey } as typeof prof);
    publicUser = mapSupabaseUserToPublicAuthUser(authUser, profileForMap);
  } catch (e) {
    console.warn("[auth] server snapshot map user degraded:", e);
    publicUser = mapDegradedPublicAuthUser(authUser);
  }

  const snap: ServerAuthSnapshot = {
    user: publicUser,
    session: { expiresAt },
    rolePageAccess,
    userPageOverrides,
    configurationError: null,
  };
  writeCachedServerAuthSnapshot(fingerprint, snap);
  return snap;
}

export async function resolveServerAuthFromCookies(cookies: CookieLike[]): Promise<ServerAuthSnapshot> {
  const fromProxy = await readProxyForwardedAuthSnapshot();
  if (fromProxy?.user?.id) return fromProxy;

  if (!isSupabasePublicEnvConfigured()) {
    return emptyAuthSnapshot(MISSING_SUPABASE_ENV_MESSAGE);
  }

  const fingerprint = cookieFingerprintFromList(cookies);
  return dedupeServerAuthFetch(fingerprint, async () => {
    const sb = await createSupabaseServerUserClient();
    return fetchServerAuthSnapshotWithClient(sb, fingerprint);
  });
}

/** Proxy: usa client con cookie refresh già agganciato alla request. */
export async function resolveServerAuthWithSupabase(
  supabase: SupabaseClient,
  cookies: CookieLike[],
): Promise<ServerAuthSnapshot> {
  if (!readSupabasePublicEnv()) {
    return emptyAuthSnapshot(MISSING_SUPABASE_ENV_MESSAGE);
  }

  const fingerprint = cookieFingerprintFromList(cookies);

  const profileCached = readCachedServerAuthSnapshot(fingerprint);
  const { data: authData, error: authError } = await getUserWithNetworkRetry(supabase);

  if (authError && shouldClearSessionOnAuthError(authError)) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    const snap = emptyAuthSnapshot();
    writeCachedServerAuthSnapshot(fingerprint, snap);
    return snap;
  }

  const authUser = authData?.user ?? null;
  if (!authUser) {
    const snap = emptyAuthSnapshot();
    if (shouldWriteEmptySnapshotToCache(authError)) {
      writeCachedServerAuthSnapshot(fingerprint, snap);
    }
    return snap;
  }

  if (isUserBanned(authUser)) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    const snap = emptyAuthSnapshot();
    writeCachedServerAuthSnapshot(fingerprint, snap);
    return snap;
  }

  if (profileCached?.user?.id === authUser.id) {
    const { data: sessionWrap } = await supabase.auth.getSession();
    const expiresAt =
      sessionWrap.session?.expires_at != null ? Math.floor(sessionWrap.session.expires_at) : profileCached.session.expiresAt;
    return { ...profileCached, session: { expiresAt } };
  }

  return fetchServerAuthSnapshotWithClient(supabase, fingerprint);
}

export async function resolveServerAuthFromRequest(request: {
  cookies: { getAll: () => CookieLike[] };
}): Promise<ServerAuthSnapshot> {
  return resolveServerAuthFromCookies(request.cookies.getAll());
}

export function getAuthUserIdFromSnapshot(snapshot: ServerAuthSnapshot): string | null {
  return snapshot.user?.id ?? null;
}

export function snapshotHasEstablishedSession(snapshot: ServerAuthSnapshot): boolean {
  return snapshot.user != null && !snapshot.configurationError;
}
