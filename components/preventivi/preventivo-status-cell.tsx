"use client";

import { GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { Tooltip } from "@/components/ui";
import { statoPillShellClass } from "@/lib/lavorazioni/lavorazioni-pill-styles";
import {
  PREVENTIVO_STATO_EDITOR_ITEMS,
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

  if (!canWrite) {
    return (
      <Tooltip content={preventivoWorkflowLabel(workflow)}>
        <span className={statoPillShellClass()} style={preventivoWorkflowPillStyle(workflow)}>
          {preventivoWorkflowLabel(workflow)}
        </span>
      </Tooltip>
    );
  }

  return (
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
  );
}
