"use client";

import { formatLastSchedaIngressoHint } from "@/lib/schede/scheda-ingresso-reuse";
import { dsAccentSoftBanner, dsBtnSoftOrange, dsFocus } from "@/lib/ui/design-system";

function IconCopiaIngressoPrecedente({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6 6h10a2 2 0 0 1 2 2v10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 12v5M9.5 14.5H14.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function CopiaUltimaSchedaIngressoBanner({
  visible,
  highlight,
  updatedAt,
  matchCount = 1,
  disabled,
  disabledTitle,
  onCopy,
}: {
  visible: boolean;
  /** Evidenzia al primo match (bordo/alone). */
  highlight: boolean;
  updatedAt?: string;
  /** Più di 1 scheda corrispondente — alla copia si chiede quale usare. */
  matchCount?: number;
  disabled?: boolean;
  disabledTitle?: string;
  onCopy: () => void;
}) {
  if (!visible) return null;

  const shellClass = [
    dsAccentSoftBanner,
    "rounded-[var(--ds-radius-xl)] px-4 py-3.5 shadow-[var(--cab-shadow-sm)] transition-[box-shadow,border-color] duration-300",
    highlight
      ? "border-[color:color-mix(in_srgb,var(--cab-primary)_52%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] shadow-[var(--cab-shadow-md),0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_32%,transparent)]"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass} role="status">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_38%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-surface))] text-[color:var(--cab-primary)] shadow-[var(--cab-shadow-sm)]"
            aria-hidden
          >
            <IconCopiaIngressoPrecedente className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]">
              Mezzo già registrato
            </p>
            <p className="mt-1 text-sm leading-snug text-[color:var(--cab-text-muted)]">
              {matchCount > 1 ? (
                <>
                  Trovate{" "}
                  <span className="font-semibold tabular-nums text-[color:var(--cab-text)]">
                    {matchCount}
                  </span>{" "}
                  schede ingresso per questo identificativo. Alla copia potrai scegliere quale usare.
                </>
              ) : updatedAt ? (
                <>
                  Ultima scheda ingresso:{" "}
                  <span className="font-semibold tabular-nums text-[color:var(--cab-text)]">
                    {formatLastSchedaIngressoHint(updatedAt)}
                  </span>
                  . Puoi copiare i dati nell’anagrafica corrente.
                </>
              ) : (
                "È disponibile una scheda ingresso precedente per questo mezzo."
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={`${dsBtnSoftOrange} w-full shrink-0 sm:w-auto ${dsFocus} ${highlight ? "shadow-[var(--cab-shadow-md)]" : ""}`}
          disabled={disabled}
          title={disabled ? disabledTitle : "Copia campi dall’ultima scheda ingresso dello stesso mezzo"}
          onClick={onCopy}
        >
          <IconCopiaIngressoPrecedente />
          Copia ultima scheda ingresso
        </button>
      </div>
    </div>
  );
}
