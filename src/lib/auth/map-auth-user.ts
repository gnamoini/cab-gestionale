import { profileDisplayName } from "@/lib/auth/profile-display-name";
import { normalizeClienteRef } from "@/src/lib/auth/cliente-portal-scope";
import { resolveFormattedUserDisplayName } from "@/src/lib/auth/resolve-user-display-name";
import { resolveRole } from "@/lib/auth/rbac";
import type { PublicAuthUser } from "@/src/types/auth-user";
import type { ProfileRow, RuoloUtente } from "@/src/types/supabase-tables";
import type { User } from "@supabase/supabase-js";

type ProfileAuthSlice = Pick<
  ProfileRow,
  "nome" | "cognome" | "username" | "ruolo" | "cliente_ref" | "created_at"
> | null;

function profileFieldsFromRow(profile: ProfileAuthSlice): {
  givenName: string;
  cognome: string | null;
  username: string | null;
  createdAt: string | null;
  composedProfileName: string | null;
} {
  const givenName = typeof profile?.nome === "string" ? profile.nome.trim() : "";
  const cognome =
    typeof profile?.cognome === "string" && profile.cognome.trim() ? profile.cognome.trim() : null;
  const username =
    typeof profile?.username === "string" && profile.username.trim() ? profile.username.trim() : null;
  const createdAt = profile?.created_at ?? null;
  const composedProfileName = givenName ? profileDisplayName({ nome: givenName, cognome }) : null;
  return { givenName, cognome, username, createdAt, composedProfileName };
}

export function mapSupabaseUserToPublicAuthUser(
  sessionUser: User,
  profile: ProfileAuthSlice,
): PublicAuthUser {
  const { givenName, cognome, username, createdAt, composedProfileName } = profileFieldsFromRow(profile);
  const nome = resolveFormattedUserDisplayName({
    email: sessionUser.email,
    profileNome: composedProfileName,
    userMetadata: { ...sessionUser.app_metadata, ...sessionUser.user_metadata },
  });
  const ruoloFromProfile = typeof profile?.ruolo === "string" ? profile.ruolo : null;
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    nome,
    givenName: givenName || nome,
    cognome,
    username,
    createdAt,
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
    givenName: nome,
    cognome: null,
    username: null,
    createdAt: null,
    ruolo: "guest",
    clienteRef: null,
  };
}
