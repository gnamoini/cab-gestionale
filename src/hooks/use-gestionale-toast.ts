"use client";

import { useCallback, useMemo } from "react";
import { useToast } from "@/context/toast-context";
import {
  humanizeGestionaleError,
  type GestionaleErrorContext,
} from "@/src/utils/gestionale-error-messages";

export function useGestionaleToast() {
  const { push } = useToast();

  const success = useCallback(
    (message: string, durationMs = 4200) => {
      push(message, "success", durationMs);
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

  const error = useCallback(
    (err: unknown, ctx?: GestionaleErrorContext, durationMs = 4800) => {
      const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "Operazione non riuscita.";
      push(humanizeGestionaleError(raw, ctx), "error", durationMs);
    },
    [push],
  );

  return useMemo(() => ({ success, warning, info, error, push }), [success, warning, info, error, push]);
}
