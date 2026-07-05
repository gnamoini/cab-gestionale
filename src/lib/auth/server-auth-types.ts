import type { PublicAuthUser } from "@/src/types/auth-user";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";

/** Snapshot serializzabile server → client (nessun JWT in prop). */
export type ServerAuthSnapshot = {
  user: PublicAuthUser | null;
  session: { expiresAt: number | null };
  rolePageAccess: Record<string, PageAccessLevel>;
  userPageOverrides: { page_key: string; access_level: PageAccessLevel }[];
  configurationError: string | null;
};

export const EMPTY_SERVER_AUTH_SNAPSHOT: ServerAuthSnapshot = {
  user: null,
  session: { expiresAt: null },
  rolePageAccess: {},
  userPageOverrides: [],
  configurationError: null,
};
