"use client";

import { IconActionButton } from "@/components/design-system";
import { dsFocus, dsTableActionBtnPrimary, dsTableActionBtnSecondary } from "@/lib/ui/design-system";
import { gestionaleListTableActionsGroupEnd } from "@/lib/ui/gestionale-list-table";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

const scortaGlyph = "h-[1.125rem] w-[1.125rem] shrink-0";

function IconMinusScorta({ className = scortaGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" d="M5 12h14" />
    </svg>
  );
}

function IconPlusScorta({ className = scortaGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** − / + scorta — tabella e scheda ricambio magazzino. */
export function MagazzinoScortaAdjustActions({
  canAdjust,
  modalitaModifica = false,
  onDecrease,
  onIncrease,
  className = "",
}: {
  canAdjust: boolean;
  /** Modalità modifica attiva: − e + primari; altrimenti entrambi neutri. */
  modalitaModifica?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  className?: string;
}) {
  const readonlyTip = canAdjust ? undefined : READONLY_PERMISSION_HINT;
  const actionClass = modalitaModifica ? dsTableActionBtnPrimary : dsTableActionBtnSecondary;

  return (
    <div
      className={`${gestionaleListTableActionsGroupEnd} shrink-0 flex-nowrap ${className}`.trim()}
      role="group"
      aria-label="Modifica scorta"
    >
      <IconActionButton
        label="Diminuisci"
        tooltipContent={readonlyTip}
        className={actionClass}
        disabled={!canAdjust}
        onClick={onDecrease}
      >
        <IconMinusScorta />
      </IconActionButton>
      <IconActionButton
        label="Aumenta"
        tooltipContent={readonlyTip}
        className={actionClass}
        disabled={!canAdjust}
        onClick={onIncrease}
      >
        <IconPlusScorta />
      </IconActionButton>
    </div>
  );
}

const infoStepperShellClass =
  "inline-flex max-w-full items-stretch overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)]";

const infoStepperBtnClass = `inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 select-none items-center justify-center border-0 bg-transparent p-0 text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)] disabled:cursor-not-allowed disabled:opacity-45 ${dsFocus} touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[background-color,transform] duration-150 active:scale-[0.97]`;

/** Stepper compatto − | valore | + — scheda ricambio (Dati principali). */
export function MagazzinoScortaInfoStepper({
  value,
  low,
  canAdjust,
  modalitaModifica = false,
  onDecrease,
  onIncrease,
}: {
  value: number;
  low: boolean;
  canAdjust: boolean;
  modalitaModifica?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const valueTone = low
    ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
    : "bg-[var(--cab-surface-2)] text-[color:var(--cab-text)]";
  const btnTone =
    modalitaModifica && canAdjust
      ? "text-[color:var(--cab-primary)] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]"
      : "";
  const readonlyTitle = canAdjust ? undefined : READONLY_PERMISSION_HINT;

  return (
    <div role="group" aria-label="Scorta" className={infoStepperShellClass}>
      <button
        type="button"
        className={`${infoStepperBtnClass} ${btnTone} rounded-none border-r border-[color:var(--cab-border)]`}
        aria-label="Diminuisci scorta"
        title={readonlyTitle}
        disabled={!canAdjust}
        onClick={onDecrease}
      >
        <IconMinusScorta />
      </button>
      <span
        className={`flex h-10 min-h-10 min-w-[2.75rem] items-center justify-center px-2 font-mono text-sm font-bold tabular-nums ${valueTone}`}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={`${infoStepperBtnClass} ${btnTone} rounded-none border-l border-[color:var(--cab-border)]`}
        aria-label="Aumenta scorta"
        title={readonlyTitle}
        disabled={!canAdjust}
        onClick={onIncrease}
      >
        <IconPlusScorta />
      </button>
    </div>
  );
}
