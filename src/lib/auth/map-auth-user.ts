import { normalizeClienteRef } from "@/src/lib/auth/cliente-portal-scope";
import { resolveFormattedUserDisplayName } from "@/src/lib/auth/resolve-user-display-name";
import { resolveRole } from "@/lib/auth/rbac";
import type { PublicAuthUser } from "@/src/types/auth-user";
import type { RuoloUtente } from "@/src/types/supabase-tables";
import type { User } from "@supabase/supabase-js";

type ProfileRow = { nome: string | null; ruolo: string | null; cliente_ref?: string | null };

export function mapSupabaseUserToPublicAuthUser(
  sessionUser: User,
  profile: ProfileRow | null,
): PublicAuthUser {
  const nome = resolveFormattedUserDisplayName({
    email: sessionUser.email,
    profileNome: profile?.nome,
    userMetadata: { ...sessionUser.app_metadata, ...sessionUser.user_metadata },
  });
  const ruoloFromProfile = typeof profile?.ruolo === "string" ? profile.ruolo : null;
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    nome,
    ruolo: resolveRole(ruoloFromProfile) as RuoloUtente,
    clienteRef: normalizeClienteRef(profile?.cliente_ref),
  };
}

export function mapDegradedPublicAuthUser(sessionUser: User): PublicAuthUser {
  const nome = resolveFormattedUserDisplayName({
    email: sessionUser.email,
    userMetadata: { ...sessionUser.app_metadata, ...sessionUser.user_metadata },
  });
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    nome,
    ruolo: "guest",
    clienteRef: null,
  };
}
