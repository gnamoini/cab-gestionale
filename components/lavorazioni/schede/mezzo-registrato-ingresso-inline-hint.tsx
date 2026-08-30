"use client";

import { mezzoIngressoSuggestLabel } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { SchedaIngressoIdentField } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsAccentSoftBanner, dsBtnSoftOrange, dsFocus } from "@/lib/ui/design-system";

export type MezzoIngressoInlineHintVariant = "trovato" | "simile" | "ambiguo" | "collegato" | "conflitto";

export function MezzoRegistratoIngressoInlineHint({
  variant,
  mezzo,
  matchField,
  ambiguousCandidates,
  onUseMezzo,
  onSelectCandidate,
  onDismiss,
  onVerifyConflict,
}: {
  variant: MezzoIngressoInlineHintVariant;
  mezzo?: MezzoGestito;
  matchField?: SchedaIngressoIdentField;
  ambiguousCandidates?: readonly MezzoGestito[];
  onUseMezzo?: () => void;
  onSelectCandidate?: (mezzo: MezzoGestito) => void;
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
      ? "Mezzo trovato in anagrafica"
      : variant === "simile"
        ? "Valore molto simile a un mezzo in anagrafica"
        : variant === "ambiguo"
          ? "Più mezzi con questo valore"
          : variant === "collegato"
            ? "Mezzo collegato"
            : "Hai modificato dati del mezzo collegato";

  const showUseMezzo = (variant === "trovato" || variant === "simile") && mezzo && onUseMezzo;
  const showDismiss =
    (variant === "trovato" || variant === "simile") && onDismiss;

  return (
    <div className={shellClass} role="status" data-match-field={matchField}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]">
        {variant === "conflitto" ? "⚠ " : variant === "ambiguo" ? "⚠ " : variant === "simile" ? "⚠ " : "✓ "}
        {title}
      </p>
      {variant === "ambiguo" && ambiguousCandidates && ambiguousCandidates.length > 0 ? (
        <ul className="mt-1 space-y-1 text-xs leading-snug text-[color:var(--cab-text-muted)]">
          {ambiguousCandidates.map((candidate) => (
            <li key={candidate.id} className="flex items-center gap-2 min-w-0 flex-nowrap sm:flex-wrap">
              <span>{mezzoIngressoSuggestLabel(candidate)}</span>
              {onSelectCandidate ? (
                <button
                  type="button"
                  className={`${dsBtnSoftOrange} ${dsFocus} !px-2 !py-0.5 text-[11px]`}
                  onClick={() => onSelectCandidate(candidate)}
                >
                  Seleziona
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : mezzo ? (
        <p className="mt-1 text-xs leading-snug text-[color:var(--cab-text-muted)]">
          {mezzoIngressoSuggestLabel(mezzo)}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2 min-w-0 flex-nowrap sm:flex-wrap">
        {showUseMezzo ? (
          <button type="button" className={`${dsBtnSoftOrange} ${dsFocus}`} onClick={onUseMezzo}>
            Usa questo mezzo
          </button>
        ) : null}
        {variant === "conflitto" && onVerifyConflict ? (
          <button type="button" className={`${dsBtnSoftOrange} ${dsFocus}`} onClick={onVerifyConflict}>
            Verifica prima del salvataggio
          </button>
        ) : null}
        {showDismiss ? (
          <button
            type="button"
            className={`text-xs text-[color:var(--cab-text-muted)] underline ${dsFocus}`}
            onClick={onDismiss}
          >
            Ignora e continua
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Avviso compatto sotto un campo scheda diverso dall'anagrafica mezzo salvata. */
export function SchedaIngressoMezzoFieldDriftHint({ savedValue }: { savedValue: string }) {
  const saved = savedValue.trim();
  return (
    <p
      className="mt-1.5 text-[11px] leading-snug text-[color:color-mix(in_srgb,var(--cab-warning,#d97706)_88%,var(--cab-text))]"
      role="status"
    >
      {saved && saved !== "—" ? (
        <>
          Stai modificando i dati del mezzo — prima:{" "}
          <span className="font-medium text-[color:var(--cab-text-muted)]">{saved}</span>
        </>
      ) : (
        "Stai modificando i dati del mezzo"
      )}
    </p>
  );
}
