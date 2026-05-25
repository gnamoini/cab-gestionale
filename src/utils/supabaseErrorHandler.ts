import { err as serviceError, type ServiceResult } from "@/src/services/service-result";
import {
  humanizeGestionaleError,
  type GestionaleErrorContext,
} from "@/src/utils/gestionale-error-messages";

export function isPostgrestLikeError(e: unknown): e is { message: string; code?: string } {
  return typeof e === "object" && e !== null && "message" in e;
}

export function formatSupabaseError(e: unknown, ctx?: GestionaleErrorContext): string {
  if (isPostgrestLikeError(e)) {
    return humanizeGestionaleError(e.message || "Errore database", ctx);
  }
  if (e instanceof Error) return humanizeGestionaleError(e.message, ctx);
  if (typeof e === "string") return humanizeGestionaleError(e, ctx);
  return "Errore sconosciuto";
}

export function serviceFailFromError<T = null>(
  e: unknown,
  data: T | null = null,
  ctx?: GestionaleErrorContext,
): ServiceResult<T> {
  return serviceError(formatSupabaseError(e, ctx), data);
}
