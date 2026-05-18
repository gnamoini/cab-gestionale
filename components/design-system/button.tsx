"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  dsBtnCtaHero,
  dsBtnDanger,
  dsBtnNeutral,
  dsBtnPrimary,
  dsBtnGhost,
  dsDisabled,
  dsFocus,
} from "@/lib/ui/design-system";

export type DsButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "cta";

const variantClass: Record<DsButtonVariant, string> = {
  primary: dsBtnPrimary,
  secondary: dsBtnNeutral,
  danger: dsBtnDanger,
  ghost: dsBtnGhost,
  cta: dsBtnCtaHero,
};

export type DsButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: DsButtonVariant;
  /** Altezza touch standard toolbar (44px). */
  size?: "md" | "sm";
  children: ReactNode;
};

const sizeClass = {
  md: "min-h-11",
  sm: "min-h-9 py-2 text-xs",
};

/** Pulsante globale — varianti allineate ai token `dsBtn*`. */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: DsButtonProps) {
  return (
    <button
      type={type}
      className={`${variantClass[variant]} ${sizeClass[size]} ${dsFocus} ${dsDisabled} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Azione primaria lista (arancione, stesso stile di “Nuova lavorazione”). */
export function PrimaryActionButton({
  className = "",
  children,
  ...rest
}: Omit<DsButtonProps, "variant">) {
  return (
    <Button variant="cta" className={`h-11 shrink-0 px-4 ${className}`.trim()} {...rest}>
      {children}
    </Button>
  );
}
