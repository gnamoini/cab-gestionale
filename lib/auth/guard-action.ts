import { READONLY_PERMISSION_HINT } from "@/lib/auth/rbac";

/** Blocco azione UI/handler se la condizione non è soddisfatta. */
export function denyUnless(
  allowed: boolean,
  onDenied?: (message: string) => void,
  message = READONLY_PERMISSION_HINT,
): allowed is true {
  if (allowed) return true;
  onDenied?.(message);
  return false;
}

/** Lancia se non autorizzato (handler async). */
export function assertAllowed(allowed: boolean, message = READONLY_PERMISSION_HINT): void {
  if (!allowed) throw new Error(message);
}
