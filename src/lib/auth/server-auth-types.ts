import type { PublicAuthUser } from "@/src/types/auth-user";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

/** Snapshot serializzabile server → client (nessun JWT in prop). */
export type ServerAuthSnapshot = {
  user: PublicAuthUser | null;
  session: { expiresAt: number | null };
  permissions: UserPermissionRow[];
  configurationError: string | null;
};

export const EMPTY_SERVER_AUTH_SNAPSHOT: ServerAuthSnapshot = {
  user: null,
  session: { expiresAt: null },
  permissions: [],
  configurationError: null,
};
