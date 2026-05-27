export type AuthStatus = "loading" | "authenticated" | "anonymous" | "degraded";

const AUTH_STATUS_VALUES: readonly AuthStatus[] = ["loading", "authenticated", "anonymous", "degraded"];

/** Sessione considerata valida per query e gate (non forzare logout su glitch rete). */
export function isAuthSessionEstablished(status: AuthStatus): boolean {
  return status === "authenticated" || status === "degraded";
}

/** Sessione pienamente verificata: usare per accesso pagine/azioni sensibili. */
export function isAuthFullyAuthenticated(status: AuthStatus): boolean {
  return status === "authenticated";
}

/** Normalizza valori esterni (API, storage) verso AuthStatus. */
export function toAuthStatus(value: unknown): AuthStatus {
  if (typeof value === "string" && (AUTH_STATUS_VALUES as readonly string[]).includes(value)) {
    return value as AuthStatus;
  }
  return "anonymous";
}
