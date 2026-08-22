import { profileDisplayName } from "@/lib/auth/profile-display-name";
import { resolveRole } from "@/lib/rbac";
import {
  isEmailDerivedDisplayName,
  resolveFormattedUserDisplayName,
} from "@/src/lib/auth/resolve-user-display-name";
import type { PublicAuthUser } from "@/src/types/auth-user";
import type { ProfileRow, RuoloUtente } from "@/src/types/supabase-tables";
import type { User } from "@supabase/supabase-js";

type ProfileAuthSlice = Pick<
  ProfileRow,
  "nome" | "cognome" | "username" | "role_key" | "cliente_ref" | "created_at"
> | null;

function normalizeClienteRef(value: string | null | undefined): string | null {
  const t = typeof value === "string" ? value.trim() : "";
  return t || null;
}

function pickCabMetadataString(meta: Record<string, unknown>, key: string): string {
  const value = meta[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Nome/cognome SSOT: profiles se valorizzati; altrimenti cab_* da creazione admin. */
function resolveAuthProfileNames(
  sessionUser: User,
  profile: ProfileAuthSlice,
): { givenName: string; cognome: string | null } {
  const email = sessionUser.email ?? "";
  const meta = { ...sessionUser.app_metadata, ...sessionUser.user_metadata };
  const cabNome = pickCabMetadataString(meta, "cab_nome");
  const cabCognomeRaw = pickCabMetadataString(meta, "cab_cognome");
  const cabCognome = cabCognomeRaw || null;

  const profileNome = typeof profile?.nome === "string" ? profile.nome.trim() : "";
  const profileCognome =
    typeof profile?.cognome === "string" && profile.cognome.trim() ? profile.cognome.trim() : null;

  if (profileNome && !isEmailDerivedDisplayName(profileNome, email)) {
    return { givenName: profileNome, cognome: profileCognome };
  }
  if (cabNome) {
    return { givenName: cabNome, cognome: cabCognome };
  }
  return { givenName: profileNome, cognome: profileCognome };
}

function profileFieldsFromRow(
  sessionUser: User,
  profile: ProfileAuthSlice,
): {
  givenName: string;
  cognome: string | null;
  username: string | null;
  createdAt: string | null;
  composedProfileName: string | null;
} {
  const { givenName, cognome } = resolveAuthProfileNames(sessionUser, profile);
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
  const { givenName, cognome, username, createdAt, composedProfileName } = profileFieldsFromRow(
    sessionUser,
    profile,
  );
  const nome =
    composedProfileName?.trim() ||
    resolveFormattedUserDisplayName({
      email: sessionUser.email,
      profileNome: composedProfileName,
      userMetadata: { ...sessionUser.app_metadata, ...sessionUser.user_metadata },
    });
  const roleKey = typeof profile?.role_key === "string" ? profile.role_key : null;
  const ruolo = resolveRole(roleKey) as RuoloUtente;
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    nome,
    givenName,
    cognome,
    username,
    createdAt,
    roleKey: ruolo,
    ruolo,
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
    roleKey: "guest",
    ruolo: "guest",
    clienteRef: null,
  };
}
