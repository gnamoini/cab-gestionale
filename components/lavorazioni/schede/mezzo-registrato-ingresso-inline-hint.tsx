"use client";

import { mezzoIngressoSuggestLabel } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { SchedaIngressoIdentField } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsAccentSoftBanner, dsBtnSoftOrange, dsFocus } from "@/lib/ui/design-system";

export type MezzoIngressoInlineHintVariant = "trovato" | "collegato" | "conflitto";

export function MezzoRegistratoIngressoInlineHint({
  variant,
  mezzo,
  matchField,
  onUseMezzo,
  onDismiss,
  onVerifyConflict,
}: {
  variant: MezzoIngressoInlineHintVariant;
  mezzo: MezzoGestito;
  matchField?: SchedaIngressoIdentField;
  onUseMezzo?: () => void;
  onDismiss?: () => void;
  onVerifyConflict?: () => void;
}) {
  const shellClass = [
    dsAccentSoftBanner,
    "mt-2 rounded-[var(--ds-radius-lg)] px-3 py-2.5 text-sm shadow-[var(--cab-shadow-sm)]",
    variant === "conflitto"
      ? "border-[color:color-mix(in_srgb,var(--cab-warning,#d97706)_45%,var(--cab-border))]"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const title =
    variant === "trovato"
      ? "Mezzo trovato"
      : variant === "collegato"
        ? "Mezzo collegato"
        : "Hai modificato dati del mezzo collegato";

  return (
    <div className={shellClass} role="status" data-match-field={matchField}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]">
        {variant === "conflitto" ? "⚠ " : variant === "trovato" ? "✓ " : "✓ "}
        {title}
      </p>
      <p className="mt-1 text-xs leading-snug text-[color:var(--cab-text-muted)]">
        {mezzoIngressoSuggestLabel(mezzo)}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {variant === "trovato" && onUseMezzo ? (
          <button type="button" className={`${dsBtnSoftOrange} ${dsFocus}`} onClick={onUseMezzo}>
            Usa questo mezzo
          </button>
        ) : null}
        {variant === "conflitto" && onVerifyConflict ? (
          <button type="button" className={`${dsBtnSoftOrange} ${dsFocus}`} onClick={onVerifyConflict}>
            Verifica prima del salvataggio
          </button>
        ) : null}
        {variant === "trovato" && onDismiss ? (
          <button type="button" className={`text-xs text-[color:var(--cab-text-muted)] underline ${dsFocus}`} onClick={onDismiss}>
            Ignora
          </button>
        ) : null}
      </div>
    </div>
  );
}
