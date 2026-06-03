"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";

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
  pendingRef.current = pending;

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
      <GestionaleConfirmDialog
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
