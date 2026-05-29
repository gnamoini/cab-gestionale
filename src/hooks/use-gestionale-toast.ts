"use client";

import { useCallback, useMemo, useRef } from "react";
import { useToastContext } from "@/context/toast-context";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import {
  humanizeGestionaleError,
  type GestionaleErrorContext,
} from "@/src/utils/gestionale-error-messages";
import { formatSupabaseError } from "@/src/utils/supabaseErrorHandler";

const ACTION_TOAST_COOLDOWN_MS = 4_000;

/**
 * Toast gestionale: messaggi standard, errori umanizzati, al massimo un toast per chiave azione.
 * Unico entry point per feedback success/error nelle view (non usare nei service).
 */
export function useGestionaleToast() {
  const { push } = useToastContext();
  const actionLastRef = useRef<Map<string, number>>(new Map());

  const shouldSkipActionToast = useCallback((actionKey: string): boolean => {
    const now = Date.now();
    const last = actionLastRef.current.get(actionKey) ?? 0;
    if (now - last < ACTION_TOAST_COOLDOWN_MS) return true;
    actionLastRef.current.set(actionKey, now);
    for (const [k, t] of actionLastRef.current) {
      if (now - t > ACTION_TOAST_COOLDOWN_MS * 2) actionLastRef.current.delete(k);
    }
    return false;
  }, []);

  const success = useCallback(
    (message: string, durationMs = 4200) => {
      push(message, "success", durationMs);
    },
    [push],
  );

  const successSaved = useCallback(
    (durationMs = 4200) => {
      push(GESTIONALE_TOAST.successSaved, "success", durationMs);
    },
    [push],
  );

  const successDone = useCallback(
    (durationMs = 4200) => {
      push(GESTIONALE_TOAST.successDone, "success", durationMs);
    },
    [push],
  );

  const successDeleted = useCallback(
    (durationMs = 4200) => {
      push(GESTIONALE_TOAST.successDeleted, "success", durationMs);
    },
    [push],
  );

  const successCreated = useCallback(
    (durationMs = 4200) => {
      push(GESTIONALE_TOAST.successCreated, "success", durationMs);
    },
    [push],
  );

  const warning = useCallback(
    (message: string, durationMs = 5200) => {
      push(message, "warning", durationMs);
    },
    [push],
  );

  const info = useCallback(
    (message: string, durationMs = 4200) => {
      push(message, "info", durationMs);
    },
    [push],
  );

  const validation = useCallback(
    (message: string, durationMs = 4800) => {
      push(message.trim() || GESTIONALE_TOAST.validationError, "warning", durationMs);
    },
    [push],
  );

  const error = useCallback(
    (err: unknown, ctx?: GestionaleErrorContext, durationMs = 4800) => {
      const message =
        typeof err === "string"
          ? humanizeGestionaleError(err, ctx)
          : formatSupabaseError(err, ctx);
      push(message, "error", durationMs);
    },
    [push],
  );

  const errorOnce = useCallback(
    (actionKey: string, err: unknown, ctx?: GestionaleErrorContext, durationMs = 4800) => {
      if (shouldSkipActionToast(`err:${actionKey}`)) return;
      error(err, ctx, durationMs);
    },
    [error, shouldSkipActionToast],
  );

  const successOnce = useCallback(
    (actionKey: string, message: string, durationMs = 4200) => {
      if (shouldSkipActionToast(`ok:${actionKey}`)) return;
      success(message, durationMs);
    },
    [shouldSkipActionToast, success],
  );

  return useMemo(
    () => ({
      success,
      successSaved,
      successDone,
      successDeleted,
      successCreated,
      warning,
      info,
      validation,
      error,
      errorOnce,
      successOnce,
    }),
    [
      success,
      successSaved,
      successDone,
      successDeleted,
      successCreated,
      warning,
      info,
      validation,
      error,
      errorOnce,
      successOnce,
    ],
  );
}
