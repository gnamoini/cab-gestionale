"use client";

import { GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { statoPillShellClass } from "@/lib/lavorazioni/lavorazioni-pill-styles";
import {
  PREVENTIVO_STATO_EDITOR_ITEMS,
  preventivoStatoLabel,
  preventivoStatoPillStyle,
} from "@/lib/preventivi/preventivo-status-ui";
import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";

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
  const options = PREVENTIVO_STATO_EDITOR_ITEMS.map((item) => ({
    ...item,
    pillStyle: preventivoStatoPillStyle(item.value),
  }));

  if (!canWrite) {
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
      options={options}
      ariaLabel={`Stato preventivo ${record.numero || record.id}`}
      disabled={disabled}
      title={preventivoStatoLabel(stato)}
      shellClass={statoPillShellClass()}
      fallbackPillStyle={preventivoStatoPillStyle(stato)}
    />
  );
}
