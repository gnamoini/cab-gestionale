"use client";

import { useEffect, useRef, useState } from "react";
import { IconActionButton } from "@/components/design-system";
import { OptionalTooltip } from "@/components/ui";
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
  embedded = false,
}: {
  canAdjust: boolean;
  /** Modalità modifica attiva: − e + primari; altrimenti entrambi neutri. */
  modalitaModifica?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  className?: string;
  /** In tabella: niente wrapper gruppo (il parent ha già `gestionaleListTableActionsGroupEnd`). */
  embedded?: boolean;
}) {
  const readonlyTip = canAdjust ? undefined : READONLY_PERMISSION_HINT;
  const actionClass = modalitaModifica ? dsTableActionBtnPrimary : dsTableActionBtnSecondary;
  const decreaseLabel = modalitaModifica ? "Scarico" : "Rettifica −";
  const increaseLabel = modalitaModifica ? "Carico" : "Rettifica +";

  const buttons = (
    <>
      <IconActionButton
        label={decreaseLabel}
        tooltipContent={readonlyTip}
        className={actionClass}
        disabled={!canAdjust}
        onClick={onDecrease}
      >
        <IconMinusScorta />
      </IconActionButton>
      <IconActionButton
        label={increaseLabel}
        tooltipContent={readonlyTip}
        className={actionClass}
        disabled={!canAdjust}
        onClick={onIncrease}
      >
        <IconPlusScorta />
      </IconActionButton>
    </>
  );

  if (embedded) {
    return <>{buttons}</>;
  }

  return (
    <div
      className={`${gestionaleListTableActionsGroupEnd} shrink-0 flex-nowrap ${className}`.trim()}
      role="group"
      aria-label={modalitaModifica ? "Carico e scarico scorta" : "Rettifica inventario scorta"}
    >
      {buttons}
    </div>
  );
}

const infoStepperShellClass =
  "inline-flex max-w-full items-stretch overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)] transition-[border-color,box-shadow] duration-300";

const infoStepperSuccessClass =
  "border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]";

const infoStepperBtnClass = `inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 select-none items-center justify-center border-0 bg-transparent p-0 text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)] disabled:cursor-not-allowed disabled:opacity-45 ${dsFocus} touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[background-color,transform] duration-150 active:scale-[0.97]`;

const noSpinner =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const infoStepperInputClass = `min-w-0 flex-1 border-0 bg-transparent ${noSpinner} h-10 min-h-10 min-w-[2.75rem] max-w-[5rem] px-2 py-0 text-center text-sm font-mono font-bold tabular-nums text-[color:var(--cab-text)] outline-none ${dsFocus} touch-manipulation`;

import { commitScortaInputDraft } from "@/lib/magazzino/scorta-input-commit";
/** Stepper compatto − | valore editabile | + — scheda ricambio (Dati principali). */
export function MagazzinoScortaInfoStepper({
  value,
  low,
  canAdjust,
  modalitaModifica = false,
  successFlash = false,
  onDecrease,
  onIncrease,
  onSetValue,
}: {
  value: number;
  low: boolean;
  canAdjust: boolean;
  modalitaModifica?: boolean;
  /** Feedback visivo breve dopo modifica scorta riuscita. */
  successFlash?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onSetValue: (target: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const committedRef = useRef(value);

  useEffect(() => {
    if (!editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
      setDraft(String(value));
      committedRef.current = value;
    }
  }, [value, editing]);

  const valueTone = low
    ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
    : "bg-[var(--cab-surface-2)] text-[color:var(--cab-text)]";
  const btnTone =
    modalitaModifica && canAdjust
      ? "text-[color:var(--cab-primary)] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]"
      : "";
  const readonlyTitle = canAdjust ? undefined : READONLY_PERMISSION_HINT;
  const modeHint = modalitaModifica ? "Carico / Scarico" : "Rettifica inventario";
  const decreaseAria = modalitaModifica ? "Scarico" : "Rettifica −";
  const increaseAria = modalitaModifica ? "Carico" : "Rettifica +";

  function commitDraft() {
    const next = commitScortaInputDraft(draft, committedRef.current);
    setDraft(String(next));
    setEditing(false);
    if (next !== committedRef.current) {
      onSetValue(next);
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--cab-text-muted)]">{modeHint}</p>
      <div
        role="group"
        aria-label="Scorta"
        className={`${infoStepperShellClass}${successFlash ? ` ${infoStepperSuccessClass}` : ""}`}
      >
      <OptionalTooltip content={readonlyTitle}>
      <button
        type="button"
        className={`${infoStepperBtnClass} ${btnTone} rounded-none border-r border-[color:var(--cab-border)]`}
        aria-label={decreaseAria}
        disabled={!canAdjust}
        onClick={() => {
          onDecrease();
          (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <IconMinusScorta />
      </button>
      </OptionalTooltip>
      <OptionalTooltip content={readonlyTitle}>
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={draft}
        disabled={!canAdjust}
        aria-label="Scorta"
        aria-live="polite"
        className={`${infoStepperInputClass} ${valueTone}`}
        onFocus={() => setEditing(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      </OptionalTooltip>
      <OptionalTooltip content={readonlyTitle}>
      <button
        type="button"
        className={`${infoStepperBtnClass} ${btnTone} rounded-none border-l border-[color:var(--cab-border)]`}
        aria-label={increaseAria}
        disabled={!canAdjust}
        onClick={() => {
          onIncrease();
          (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <IconPlusScorta />
      </button>
      </OptionalTooltip>
      </div>
    </div>
  );
}
