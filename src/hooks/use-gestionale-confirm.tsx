"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GestionaleConfirmDialogLazy } from "@/components/gestionale/gestionale-confirm-dialog-lazy";

export type GestionaleConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = GestionaleConfirmOptions & {
  resolve: (value: boolean) => void;
};

/**
 * Conferme non bloccanti (sostituisce window.confirm).
 * Montare `confirmDialog` nel JSX del componente chiamante.
 */
export function useGestionaleConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const confirm = useCallback((options: GestionaleConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending((prev) => {
        if (prev) prev.resolve(false);
        return { ...options, resolve };
      });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    const cur = pendingRef.current;
    if (!cur) return;
    cur.resolve(value);
    setPending(null);
  }, []);

  const confirmDialog = useMemo(
    () => (
      <GestionaleConfirmDialogLazy
        open={pending != null}
        title={pending?.title ?? ""}
        message={pending?.message}
        confirmLabel={pending?.confirmLabel}
        cancelLabel={pending?.cancelLabel}
        destructive={pending?.destructive}
        onCancel={() => close(false)}
        onConfirm={() => close(true)}
      />
    ),
    [close, pending],
  );

  return { confirm, confirmDialog };
}
