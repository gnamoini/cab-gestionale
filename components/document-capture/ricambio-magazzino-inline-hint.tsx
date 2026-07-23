"use client";

import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { dsAccentSoftBanner, dsBtnSoftOrange, dsFocus } from "@/lib/ui/design-system";

export function RicambioMagazzinoInlineHint({
  item,
  onUseRicambio,
  onDismiss,
}: {
  item: RicambioMagazzino;
  onUseRicambio: () => void;
  onDismiss?: () => void;
}) {
  const codiceUi = ricambioCodiceForUi(item.codiceFornitoreOriginale);
  const shellClass = [
    dsAccentSoftBanner,
    "mt-2 w-full min-w-0 rounded-[var(--ds-radius-lg)] px-3 py-2.5 text-sm shadow-[var(--cab-shadow-sm)]",
  ].join(" ");

  return (
    <div className={shellClass} role="status">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]">
        ✓ Ricambio in magazzino
      </p>
      <p className="mt-1 text-xs leading-snug text-[color:var(--cab-text-muted)]">
        {codiceUi ? <span className="font-medium text-[color:var(--cab-fg)]">{codiceUi}</span> : null}
        {codiceUi && item.descrizione ? " · " : null}
        {item.descrizione ?? ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={`${dsBtnSoftOrange} ${dsFocus}`} onClick={onUseRicambio}>
          Usa questo ricambio
        </button>
        {onDismiss ? (
          <button
            type="button"
            className={`text-xs text-[color:var(--cab-text-muted)] underline ${dsFocus}`}
            onClick={onDismiss}
          >
            Ignora
          </button>
        ) : null}
      </div>
    </div>
  );
}
