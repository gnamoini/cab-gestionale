/** Finestra in cui l'ultimo login Supabase è considerato "online" (proxy presenza). */
export const SECURITY_USER_ONLINE_WINDOW_MS = 30 * 60_000;

export type SecuritySignInActivity = "active" | "inactive" | "dormant" | "never";
export type SecurityUserPresence = "online" | "offline" | "never";

export const SECURITY_USER_PRESENCE_LABEL: Record<SecurityUserPresence, string> = {
  online: "Online",
  offline: "Offline",
  never: "Offline",
};

export const SECURITY_SIGN_IN_ACTIVITY_LABEL: Record<Exclude<SecuritySignInActivity, "never">, string> = {
  active: "Attivo",
  inactive: "Inattivo",
  dormant: "Dormiente",
};

export function formatSecurityWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function formatSecurityNullableWhen(iso: string | null): string {
  return iso ? formatSecurityWhen(iso) : "—";
}

export function securityUserPresence(lastSignInAt: string | null, now = Date.now()): SecurityUserPresence {
  if (!lastSignInAt) return "never";
  const elapsed = now - new Date(lastSignInAt).getTime();
  return elapsed <= SECURITY_USER_ONLINE_WINDOW_MS ? "online" : "offline";
}

export function securitySignInActivity(lastSignInAt: string | null, now = Date.now()): SecuritySignInActivity {
  if (!lastSignInAt) return "never";
  const days = (now - new Date(lastSignInAt).getTime()) / 86_400_000;
  if (days <= 7) return "active";
  if (days <= 90) return "inactive";
  return "dormant";
}

/** Tempo relativo per badge lista utenti (es. "Online ora", "23 giorni fa"). */
export function formatSecurityLastSignInRelative(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diffMs = Math.max(0, now - then);
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Online ora";
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffHours < 24) return `${diffHours} h fa`;
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 sett. fa" : `${weeks} sett. fa`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "1 mese fa" : `${months} mesi fa`;
  }
  return formatSecurityWhen(iso);
}
