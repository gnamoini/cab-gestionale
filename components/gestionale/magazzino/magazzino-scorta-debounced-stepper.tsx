"use client";

import { MagazzinoScortaInfoStepper } from "@/components/gestionale/magazzino/magazzino-scorta-adjust-actions";
import { useMagazzinoDebouncedScortaQuantity } from "@/components/gestionale/magazzino/magazzino-debounced-scorta-context";
import { MagazzinoScortaStatusIndicator } from "@/components/gestionale/magazzino/magazzino-scorta-status-indicator";
import { DisabledElementTooltip } from "@/components/ui";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

/** Stepper scorta con debounce — scheda ricambio. */
export function MagazzinoScortaDebouncedInfoStepper({
  ricambioId,
  ricambioLabel,
  fallbackScorta,
  low,
  canAdjust,
  modalitaModifica = false,
  successFlash = false,
}: {
  ricambioId: string;
  ricambioLabel: string;
  fallbackScorta: number;
  low: boolean;
  canAdjust: boolean;
  modalitaModifica?: boolean;
  successFlash?: boolean;
}) {
  const { displayQuantity, increment, decrement, setQuantity, showSuccess, isCommitting } =
    useMagazzinoDebouncedScortaQuantity({
      ricambioId,
      ricambioLabel,
      fallbackScorta,
    });

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <MagazzinoScortaInfoStepper
          value={displayQuantity}
          low={low}
          canAdjust={canAdjust}
          modalitaModifica={modalitaModifica}
          successFlash={successFlash || showSuccess}
          onDecrease={decrement}
          onIncrease={increment}
          onSetValue={setQuantity}
        />
        <MagazzinoScortaStatusIndicator isCommitting={isCommitting} showSuccess={showSuccess} />
      </div>
    </div>
  );
}

/** Carica/Scarica rapido nel footer modal scheda ricambio. */
export function MagazzinoScortaModalQuickAdjust({
  ricambioId,
  ricambioLabel,
  fallbackScorta,
  low,
  canAdjust,
}: {
  ricambioId: string;
  ricambioLabel: string;
  fallbackScorta: number;
  low: boolean;
  canAdjust: boolean;
}) {
  const { displayQuantity, increment, decrement, isCommitting, showSuccess } =
    useMagazzinoDebouncedScortaQuantity({
      ricambioId,
      ricambioLabel,
      fallbackScorta,
    });

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <DisabledElementTooltip content={READONLY_PERMISSION_HINT} disabled={!canAdjust}>
        <button
          type="button"
          className={`${erpBtnAccent} min-h-10 w-full justify-center text-sm disabled:opacity-45`}
          disabled={!canAdjust}
          onClick={decrement}
        >
          Scarica −1
        </button>
      </DisabledElementTooltip>
      <span
        className={`inline-flex min-w-[2.5rem] items-center justify-center gap-1 px-1 text-center font-mono text-lg font-bold tabular-nums ${
          low ? "text-red-600 dark:text-red-400" : "text-[color:var(--cab-text)]"
        }`}
        aria-label={`Scorta attuale: ${displayQuantity}`}
      >
        {displayQuantity}
        <MagazzinoScortaStatusIndicator isCommitting={isCommitting} showSuccess={showSuccess} />
      </span>
      <DisabledElementTooltip content={READONLY_PERMISSION_HINT} disabled={!canAdjust}>
        <button
          type="button"
          className={`${erpBtnAccent} min-h-10 w-full justify-center text-sm disabled:opacity-45`}
          disabled={!canAdjust}
          onClick={increment}
        >
          Carica +1
        </button>
      </DisabledElementTooltip>
    </div>
  );
}
