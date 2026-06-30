"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { GeminiSparkIcon } from "@/components/design-system/gemini-spark-icon";
import {
  dsBtnAiPrimary,
  dsBtnAiPrimarySm,
  dsBtnAiSecondary,
  dsBtnAiSecondarySm,
  dsDisabled,
  dsFocus,
} from "@/lib/ui/design-system";

export type GestionaleAiActionButtonVariant = "primary" | "secondary";
export type GestionaleAiActionButtonSize = "md" | "sm";

export type GestionaleAiActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: GestionaleAiActionButtonVariant;
  size?: GestionaleAiActionButtonSize;
  /** Mostra icona spark Gemini a sinistra del testo. */
  showIcon?: boolean;
  /** Stato generazione / attesa modello. */
  loading?: boolean;
  children: ReactNode;
};

const variantSizeClass: Record<GestionaleAiActionButtonVariant, Record<GestionaleAiActionButtonSize, string>> = {
  primary: {
    md: dsBtnAiPrimary,
    sm: dsBtnAiPrimarySm,
  },
  secondary: {
    md: dsBtnAiSecondary,
    sm: dsBtnAiSecondarySm,
  },
};

const iconSizeClass: Record<GestionaleAiActionButtonSize, string> = {
  md: "h-[1.125rem] w-[1.125rem]",
  sm: "h-4 w-4",
};

/**
 * Tasto azioni IA — pill arancione stile Gemini (gradiente soft, spark icon).
 * SSOT per Genera analisi, Rigenera, Riprova, ecc.
 */
export function GestionaleAiActionButton({
  variant = "primary",
  size = "md",
  showIcon = true,
  loading = false,
  className = "",
  type = "button",
  disabled,
  children,
  ...rest
}: GestionaleAiActionButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      data-gestionale-ai-action=""
      data-variant={variant}
      aria-busy={loading || undefined}
      className={[
        variantSizeClass[variant][size],
        loading ? "gestionale-ai-action-btn-loading" : "",
        dsFocus,
        dsDisabled,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {showIcon ? (
        <span
          className={[
            "inline-flex shrink-0 items-center justify-center",
            loading ? "gestionale-ai-action-btn-icon-pulse" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden
        >
          <GeminiSparkIcon className={iconSizeClass[size]} />
        </span>
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
