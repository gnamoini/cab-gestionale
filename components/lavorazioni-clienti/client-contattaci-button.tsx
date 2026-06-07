"use client";

import { IconInfo } from "@/components/lavorazioni-clienti/client-lavorazioni-icons";
import { dsBtnPrimary, dsPageToolbarBtn } from "@/lib/ui/design-system";

export type ClientContattaciButtonVariant = "primary" | "toolbar";

export function ClientContattaciButton({
  onClick,
  variant = "primary",
}: {
  onClick: () => void;
  variant?: ClientContattaciButtonVariant;
}) {
  const className =
    variant === "toolbar"
      ? `${dsPageToolbarBtn} min-h-11 gap-2`
      : `${dsBtnPrimary} min-h-11 w-full gap-2 touch-manipulation sm:w-auto`;

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label="Contattaci"
    >
      <IconInfo className="h-4 w-4 shrink-0 opacity-90" />
      Contattaci
    </button>
  );
}
