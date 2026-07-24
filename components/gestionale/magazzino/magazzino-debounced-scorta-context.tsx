"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import {
  useDebouncedInventoryQuantity,
  type UseDebouncedInventoryQuantityResult,
} from "@/src/hooks/gestionale/use-debounced-inventory-quantity";

export type MagazzinoDebouncedScortaContextValue = {
  contaStatistiche: boolean;
  canAdjust: boolean;
  onPersistLog: (logId: string, ricambioId: string, ricambioLabel: string, prima: number, dopo: number) => void;
  onRemoveLog: (logId: string) => void;
  onCommitSuccess: (ricambioId: string) => void;
  onCommitError: (error: string) => void;
};

const MagazzinoDebouncedScortaContext = createContext<MagazzinoDebouncedScortaContextValue | null>(null);

export function MagazzinoDebouncedScortaProvider({
  value,
  children,
}: {
  value: MagazzinoDebouncedScortaContextValue;
  children: ReactNode;
}) {
  return (
    <MagazzinoDebouncedScortaContext.Provider value={value}>{children}</MagazzinoDebouncedScortaContext.Provider>
  );
}

function useMagazzinoDebouncedScortaContext(): MagazzinoDebouncedScortaContextValue {
  const ctx = useContext(MagazzinoDebouncedScortaContext);
  if (!ctx) {
    throw new Error("useMagazzinoDebouncedScortaContext requires MagazzinoDebouncedScortaProvider");
  }
  return ctx;
}

export function useMagazzinoDebouncedScortaQuantity(opts: {
  ricambioId: string;
  ricambioLabel: string;
  fallbackScorta?: number;
}): UseDebouncedInventoryQuantityResult {
  const ctx = useMagazzinoDebouncedScortaContext();
  const { ricambioId, ricambioLabel, fallbackScorta = 0 } = opts;

  const onPersistLog = useCallback(
    (logId: string, prima: number, dopo: number) => {
      ctx.onPersistLog(logId, ricambioId, ricambioLabel, prima, dopo);
    },
    [ctx, ricambioId, ricambioLabel],
  );

  const onCommitSuccess = useCallback(() => {
    ctx.onCommitSuccess(ricambioId);
  }, [ctx, ricambioId]);

  const onCommitError = useCallback(
    (error: string) => {
      ctx.onCommitError(error);
    },
    [ctx],
  );

  return useDebouncedInventoryQuantity({
    ricambioId,
    ricambioLabel,
    fallbackScorta,
    contaStatistiche: ctx.contaStatistiche,
    enabled: ctx.canAdjust,
    onPersistLog,
    onRemoveLog: ctx.onRemoveLog,
    onCommitSuccess,
    onCommitError,
  });
}

/** Provider standalone per modal scheda (fuori dal tree tabella). */
export function MagazzinoDebouncedScortaModalProvider({
  contaStatistiche,
  canAdjust,
  onPersistLog,
  onRemoveLog,
  onCommitSuccess,
  onCommitError,
  children,
}: MagazzinoDebouncedScortaContextValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ contaStatistiche, canAdjust, onPersistLog, onRemoveLog, onCommitSuccess, onCommitError }),
    [contaStatistiche, canAdjust, onPersistLog, onRemoveLog, onCommitSuccess, onCommitError],
  );
  return <MagazzinoDebouncedScortaProvider value={value}>{children}</MagazzinoDebouncedScortaProvider>;
}
