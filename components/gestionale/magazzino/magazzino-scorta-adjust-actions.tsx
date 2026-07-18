"use client";

import { IconActionButton } from "@/components/design-system";
import { dsTableActionBtnPrimary, dsTableActionBtnSecondary } from "@/lib/ui/design-system";
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
