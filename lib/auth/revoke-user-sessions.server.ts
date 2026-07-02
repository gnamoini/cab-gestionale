import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type RevokeUserSessionsResult =
  | { revoked: true }
  | {
      revoked: false;
      reason: "target_jwt_unavailable" | "api_unsupported" | "ban_primary_only";
    };

type RevokeInput = {
  admin: SupabaseClient;
  /** JWT access token del target — richiesto da auth.admin.signOut(jwt, scope) su supabase-js 2.49 */
  targetAccessJwt?: string | null;
};

/**
 * Revoca sessioni via Admin API quando possibile.
 * Ban (`ban_duration`) resta il meccanismo primary; senza JWT target non si chiama signOut con UUID.
 */
export async function revokeUserSessionsAdmin(input: RevokeInput): Promise<RevokeUserSessionsResult> {
  const jwt = input.targetAccessJwt?.trim();
  if (!jwt) {
    console.warn("[security] revokeUserSessionsAdmin: skip — target_jwt_unavailable (ban handles refresh block)");
    return { revoked: false, reason: "target_jwt_unavailable" };
  }

  const signOut = input.admin.auth.admin.signOut;
  if (typeof signOut !== "function") {
    console.warn("[security] revokeUserSessionsAdmin: skip — api_unsupported");
    return { revoked: false, reason: "api_unsupported" };
  }

  const { error } = await signOut.call(input.admin.auth.admin, jwt, "global");
  if (error) {
    console.warn("[security] revokeUserSessionsAdmin:", error.message);
    return { revoked: false, reason: "ban_primary_only" };
  }

  return { revoked: true };
}
