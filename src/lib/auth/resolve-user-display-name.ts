function normalizeComparable(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function emailLocalPart(email: string | null | undefined): string {
  if (!email) return "";
  return email.split("@")[0]?.trim() ?? "";
}

function pickMetadataString(meta: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** True when the label is only the email local-part (with optional separators/digits). */
export function isEmailDerivedDisplayName(name: string, email: string | null | undefined): boolean {
  const trimmed = name.trim();
  if (!trimmed || !email) return false;
  const local = emailLocalPart(email);
  if (!local) return false;
  if (trimmed.toLowerCase() === local.toLowerCase()) return true;
  return normalizeComparable(trimmed) === normalizeComparable(local);
}

/** Single token with digits and no spaces — likely an auto-generated username. */
function looksLikeAutoUsername(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  return /\d/.test(trimmed);
}

function isRealProfileName(name: string, email: string | null | undefined): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (isEmailDerivedDisplayName(trimmed, email)) return false;
  if (looksLikeAutoUsername(trimmed)) return false;
  return true;
}

function inferNameFromEmailLocal(local: string): string {
  const segments = local.split(/[._+-]/).filter((part) => part.length > 0);
  if (segments.length >= 2 && segments[0]!.length >= 2) {
    return segments[0]!;
  }
  const withoutTrailingDigits = local.replace(/\d+$/, "");
  if (withoutTrailingDigits.length >= 3 && withoutTrailingDigits.length < local.length) {
    return withoutTrailingDigits;
  }
  return local;
}

export function resolveUserDisplayName(input: {
  email?: string | null;
  profileNome?: string | null;
  userMetadata?: Record<string, unknown> | null;
}): string {
  const meta = input.userMetadata ?? {};
  const email = input.email?.trim() ?? "";
  const local = emailLocalPart(email);
  const profileNome = typeof input.profileNome === "string" ? input.profileNome.trim() : "";

  const fullName = pickMetadataString(meta, "full_name");
  if (fullName) return fullName;

  if (profileNome && isRealProfileName(profileNome, email)) return profileNome;

  const cabNome = pickMetadataString(meta, "cab_nome");
  if (cabNome) return cabNome;

  const metaNome = pickMetadataString(meta, "nome", "name");
  if (metaNome) return metaNome;

  if (local) return inferNameFromEmailLocal(local);

  return "Utente";
}

/** Nome breve per welcome dashboard — solo primo nome, senza cognome. */
export function welcomeFirstName(input: { givenName?: string | null; displayName?: string }): string {
  const given = input.givenName?.trim();
  if (given) {
    const first = given.split(/\s+/).filter(Boolean)[0] ?? given;
    return formatUserDisplayName(first);
  }
  const display = formatUserDisplayName(input.displayName?.trim() || "Team CAB");
  return display.split(/\s+/).filter(Boolean)[0] ?? display;
}

/** Nome utente in forma leggibile (es. «mario rossi» → «Mario Rossi»). */
export function formatUserDisplayName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("it-IT") + part.slice(1).toLocaleLowerCase("it-IT"))
    .join(" ");
}

export function resolveFormattedUserDisplayName(input: {
  email?: string | null;
  profileNome?: string | null;
  userMetadata?: Record<string, unknown> | null;
}): string {
  return formatUserDisplayName(resolveUserDisplayName(input));
}

/** Nome/cognome per sezione profilo quando il campo nome è derivato da email/username. */
export function resolveProfileAccountNames(input: {
  givenName: string;
  cognome: string | null;
  email: string;
  displayName: string;
}): { nome: string; cognome: string | null } {
  const cognome = input.cognome?.trim() || null;
  const givenName = input.givenName.trim();

  if (cognome) {
    const nome = givenName && !isEmailDerivedDisplayName(givenName, input.email)
      ? formatUserDisplayName(givenName)
      : formatUserDisplayName(input.displayName.split(/\s+/)[0] ?? givenName);
    return { nome, cognome: formatUserDisplayName(cognome) };
  }

  if (givenName && !isEmailDerivedDisplayName(givenName, input.email)) {
    const parts = givenName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return {
        nome: formatUserDisplayName(parts[0]!),
        cognome: formatUserDisplayName(parts.slice(1).join(" ")),
      };
    }
    return { nome: formatUserDisplayName(givenName), cognome: null };
  }

  const local = emailLocalPart(input.email);
  if (local) {
    const segments = local.split(/[._+-]/).filter((part) => part.length > 0);
    if (segments.length >= 2) {
      return {
        nome: formatUserDisplayName(segments[0]!),
        cognome: formatUserDisplayName(segments.slice(1).join(" ")),
      };
    }
  }

  if (givenName) return { nome: formatUserDisplayName(givenName), cognome: null };
  if (input.displayName.trim()) return { nome: input.displayName.trim(), cognome: null };
  return { nome: "—", cognome: null };
}
