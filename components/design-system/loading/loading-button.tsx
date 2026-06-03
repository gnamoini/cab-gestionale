"use client";

import { memo, type ReactNode } from "react";
import { Button, type DsButtonProps } from "@/components/design-system/button";
import { LoadingSpinner } from "./loading-spinner";

export type LoadingButtonPreset = "salva" | "elimina" | "crea";

const PRESET_LABELS: Record<LoadingButtonPreset, string> = {
  salva: "Salvataggio…",
  elimina: "Eliminazione…",
  crea: "Creazione…",
};

export type LoadingButtonProps = Omit<DsButtonProps, "children"> & {
  loading?: boolean;
  loadingLabel?: string;
  preset?: LoadingButtonPreset;
  children: ReactNode;
};

export const LoadingButton = memo(function LoadingButton({
  loading = false,
  loadingLabel,
  preset,
  disabled,
  children,
  className = "",
  ...rest
}: LoadingButtonProps) {
  const label =
    loadingLabel ?? (preset ? PRESET_LABELS[preset] : undefined) ?? "Caricamento…";
  const isDisabled = loading || disabled;

  return (
    <Button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex min-w-0 items-center justify-center gap-2 ${className}`.trim()}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" label={label} />
          <span>{label}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
});
