"use client";

import { GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { statoPillShellClass } from "@/lib/lavorazioni/lavorazioni-pill-styles";
import {
  PREVENTIVO_STATO_EDITOR_ITEMS,
  preventivoStatoLabel,
  preventivoStatoPillStyle,
} from "@/lib/preventivi/preventivo-status-ui";
import { preventivoStatoTransitionTargets } from "@/lib/preventivi/preventivo-transitions";
import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";

function editorItemsForStato(current: PreventivoStato) {
  const targets = preventivoStatoTransitionTargets(current);
  if (targets.length === 0) {
    return PREVENTIVO_STATO_EDITOR_ITEMS.filter((item) => item.value === current);
  }
  const allowed = new Set<PreventivoStato>([current, ...targets]);
  return PREVENTIVO_STATO_EDITOR_ITEMS.filter((item) => allowed.has(item.value));
}

export function PreventivoStatusCell({
  record,
  canWrite,
  disabled,
  onStatusChange,
}: {
  record: PreventivoRecord;
  canWrite: boolean;
  disabled?: boolean;
  onStatusChange: (record: PreventivoRecord, status: PreventivoStato) => void;
}) {
  const stato = record.stato;
  const readOnly = !canWrite || stato === "annullato" || preventivoStatoTransitionTargets(stato).length === 0;

  if (readOnly) {
    return (
      <span
        className={statoPillShellClass()}
        style={preventivoStatoPillStyle(stato)}
        title={preventivoStatoLabel(stato)}
      >
        {preventivoStatoLabel(stato)}
      </span>
    );
  }

  return (
    <GlobalFixedListPillSelect
      value={stato}
      onChange={(v) => {
        const next = v as PreventivoStato;
        if (next !== stato) onStatusChange(record, next);
      }}
      options={editorItemsForStato(stato)}
      ariaLabel={`Stato preventivo ${record.numero || record.id}`}
      disabled={disabled}
      title={preventivoStatoLabel(stato)}
      shellClass={statoPillShellClass()}
      fallbackPillStyle={preventivoStatoPillStyle(stato)}
    />
  );
}
