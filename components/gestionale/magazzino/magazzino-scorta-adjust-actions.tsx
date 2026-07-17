"use client";

import { IconActionButton } from "@/components/design-system";
import {
  dsTableActionBtnDanger,
  dsTableActionBtnPrimary,
  dsTableActionBtnUndo,
} from "@/lib/ui/design-system";
import { gestionaleListTableActionsGroupEnd } from "@/lib/ui/gestionale-list-table";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

const scortaGlyph = "h-[1.125rem] w-[1.125rem] shrink-0";

function IconUndoScorta({ className = scortaGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
      />
    </svg>
  );
}

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

/** Annulla / − / + scorta — stesso comportamento tabella magazzino. */
export function MagazzinoScortaAdjustActions({
  canAdjust,
  canUndo,
  onUndo,
  onDecrease,
  onIncrease,
  className = "",
}: {
  canAdjust: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  className?: string;
}) {
  const readonlyTip = canAdjust ? undefined : READONLY_PERMISSION_HINT;

  return (
    <div
      className={`${gestionaleListTableActionsGroupEnd} shrink-0 flex-nowrap ${className}`.trim()}
      role="group"
      aria-label="Modifica scorta"
    >
      <IconActionButton
        label="Annulla"
        tooltipContent={readonlyTip ?? (canUndo ? undefined : "Nessuna modifica annullabile")}
        className={dsTableActionBtnUndo}
        disabled={!canAdjust || !canUndo}
        onClick={onUndo}
      >
        <IconUndoScorta />
      </IconActionButton>
      <IconActionButton
        label="Diminuisci"
        tooltipContent={readonlyTip}
        className={dsTableActionBtnDanger}
        disabled={!canAdjust}
        onClick={onDecrease}
      >
        <IconMinusScorta />
      </IconActionButton>
      <IconActionButton
        label="Aumenta"
        tooltipContent={readonlyTip}
        className={dsTableActionBtnPrimary}
        disabled={!canAdjust}
        onClick={onIncrease}
      >
        <IconPlusScorta />
      </IconActionButton>
    </div>
  );
}
