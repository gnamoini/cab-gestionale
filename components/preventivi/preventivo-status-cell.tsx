"use client";

import { GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { statoPillShellClass } from "@/lib/lavorazioni/lavorazioni-pill-styles";
import {
  PREVENTIVO_STATO_EDITOR_ITEMS,
  preventivoClienteDisplayLabel,
  preventivoClienteLabel,
  preventivoClientePillStyle,
  preventivoWorkflowLabel,
  preventivoWorkflowPillStyle,
} from "@/lib/preventivi/preventivo-status-ui";
import type { PreventivoRecord, PreventivoStatoWorkflow } from "@/lib/preventivi/types";

export function PreventivoStatusCell({
  record,
  canWrite,
  disabled,
  onStatusChange,
}: {
  record: PreventivoRecord;
  canWrite: boolean;
  disabled?: boolean;
  onStatusChange: (record: PreventivoRecord, workflow: PreventivoStatoWorkflow) => void;
}) {
  const workflow = record.statoWorkflow;
  const options = PREVENTIVO_STATO_EDITOR_ITEMS.map((item) => ({
    ...item,
    pillStyle: preventivoWorkflowPillStyle(item.value),
  }));

  const clienteBadge =
    record.statoCliente != null ? (
      <span
        className={statoPillShellClass()}
        style={preventivoClientePillStyle(record.statoCliente)}
        title={preventivoClienteDisplayLabel(record.statoCliente, record.metodoAccettazione)}
      >
        {preventivoClienteLabel(record.statoCliente)}
      </span>
    ) : null;

  if (!canWrite) {
    return (
      <div className="flex flex-col gap-1">
        <span
          className={statoPillShellClass()}
          style={preventivoWorkflowPillStyle(workflow)}
          title={preventivoWorkflowLabel(workflow)}
        >
          {preventivoWorkflowLabel(workflow)}
        </span>
        {clienteBadge}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <GlobalFixedListPillSelect
        value={workflow}
        onChange={(v) => {
          const next = v as PreventivoStatoWorkflow;
          if (next !== workflow) onStatusChange(record, next);
        }}
        options={options}
        ariaLabel={`Stato workflow preventivo ${record.numero || record.id}`}
        disabled={disabled}
        title={preventivoWorkflowLabel(workflow)}
        shellClass={statoPillShellClass()}
        fallbackPillStyle={preventivoWorkflowPillStyle(workflow)}
      />
      {clienteBadge}
      {record.statoCliente === "pending" && record.scadenzaAccettazioneAt ? (
        <span className="text-[10px] text-zinc-500">Scadenza risposta attiva</span>
      ) : null}
      {record.metodoAccettazione ? (
        <span className="text-[10px] text-zinc-500">{record.metodoAccettazione}</span>
      ) : null}
    </div>
  );
}
