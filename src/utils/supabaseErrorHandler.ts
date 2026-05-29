import { err as serviceError, type ServiceResult } from "@/src/services/service-result";
import {
  humanizeGestionaleError,
  isGestionalePermissionError,
  type GestionaleErrorContext,
} from "@/src/utils/gestionale-error-messages";

export type SupabaseLikeError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function isPostgrestLikeError(e: unknown): e is SupabaseLikeError {
  return typeof e === "object" && e !== null && "message" in e;
}

export function extractSupabaseError(e: unknown): SupabaseLikeError | null {
  if (isPostgrestLikeError(e)) return e;
  if (e instanceof Error) return { message: e.message };
  if (typeof e === "string") return { message: e };
  return null;
}

export function isPermissionDeniedError(e: unknown): boolean {
  const extracted = extractSupabaseError(e);
  if (!extracted) return false;
  if (extracted.code === "42501" || extracted.code === "PGRST301") return true;
  return isGestionalePermissionError(extracted.message);
}

export function formatSupabaseError(e: unknown, ctx?: GestionaleErrorContext): string {
  const extracted = extractSupabaseError(e);
  if (!extracted) return "Operazione non riuscita. Riprova tra poco.";
  const parts = [extracted.message, extracted.details, extracted.hint].filter(Boolean).join(" ");
  return humanizeGestionaleError(parts || "Errore database", ctx);
}

export function serviceFailFromError<T = null>(
  e: unknown,
  data: T | null = null,
  ctx?: GestionaleErrorContext,
): ServiceResult<T> {
  return serviceError(formatSupabaseError(e, ctx), data);
}

/** Messaggio umano per `err()` nei service (sostituisce `error.message` grezzo). */
export function errMessageFromSupabase(e: unknown, ctx?: GestionaleErrorContext): string {
  return formatSupabaseError(e, ctx);
}
