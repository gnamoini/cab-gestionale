import { isUserBanned } from "@/lib/auth/user-ban-state";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE, readSupabasePublicEnv } from "@/lib/env/supabase-public";
import {
  shouldClearSessionOnAuthError,
  isTransientNetworkAuthError,
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
import { loadRolePermissionKeys, loadUserPermissionOverrides } from "@/src/lib/rbac/load-rbac-data";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

type CookieLike = { name: string; value: string };

async function getUserWithNetworkRetry(supabase: SupabaseClient) {
  const first = await supabase.auth.getUser();
  if (!first.error) return first;
  if (shouldClearSessionOnAuthError(first.error) || !isTransientNetworkAuthError(first.error)) {
    return first;
  }
  await new Promise((r) => setTimeout(r, 300));
  return supabase.auth.getUser();
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
    writeCachedServerAuthSnapshot(fingerprint, snap);
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

  const [{ data: prof, error: profErr }, { data: permRows, error: permErr }] = await Promise.all([
    supabase.from("profiles").select("nome, cognome, username, role_key, cliente_ref, created_at").eq("id", authUser.id).maybeSingle(),
    supabase
      .from("user_permissions")
      .select("user_id, permission_id, effect, permissions(key, module, action)")
      .eq("user_id", authUser.id),
  ]);

  if (profErr) {
    console.warn("[auth] server snapshot profilo non leggibile:", profErr.message);
  }
  if (permErr) {
    console.warn("[auth] server snapshot permessi non leggibili:", permErr.message);
  }

  const roleKey = typeof prof?.role_key === "string" ? prof.role_key : "guest";
  let rolePermissionKeys: string[] = [];
  try {
    rolePermissionKeys = await loadRolePermissionKeys(supabase, roleKey);
  } catch (e) {
    console.warn("[auth] role permissions load failed:", e);
  }

  let publicUser;
  try {
    publicUser = mapSupabaseUserToPublicAuthUser(authUser, prof);
  } catch (e) {
    console.warn("[auth] server snapshot map user degraded:", e);
    publicUser = mapDegradedPublicAuthUser(authUser);
  }

  const snap: ServerAuthSnapshot = {
    user: publicUser,
    session: { expiresAt },
    permissions: (permRows ?? []) as unknown as UserPermissionRow[],
    rolePermissionKeys,
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
    writeCachedServerAuthSnapshot(fingerprint, snap);
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
