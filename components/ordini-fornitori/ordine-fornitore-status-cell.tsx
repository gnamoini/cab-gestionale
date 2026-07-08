"use client";

import { GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { OrdineFornitoreStatusBadge } from "@/components/ordini-fornitori/ordine-fornitore-status-badge";
import { statoPillShellClass } from "@/lib/lavorazioni/lavorazioni-pill-styles";
import {
  ORDINE_FORNITORE_STATUS_EDITOR_ITEMS,
  ordineFornitoreStatusLabel,
  ordineFornitoreStatusPillStyle,
} from "@/lib/ordini-fornitori/ordine-fornitore-status-ui";
import type { OrdineFornitoreRecord, OrdineFornitoreStatus } from "@/lib/ordini-fornitori/types";

export function OrdineFornitoreStatusCell({
  record,
  canWrite,
  disabled,
  onStatusChange,
}: {
  record: OrdineFornitoreRecord;
  canWrite: boolean;
  disabled?: boolean;
  onStatusChange: (record: OrdineFornitoreRecord, status: OrdineFornitoreStatus) => void;
}) {
  const status = record.status;

  if (!canWrite || status === "annullato") {
    return <OrdineFornitoreStatusBadge status={status} />;
  }

  return (
    <GlobalFixedListPillSelect
      value={status}
      onChange={(v) => {
        const next = v as OrdineFornitoreStatus;
        if (next !== status) onStatusChange(record, next);
      }}
      options={ORDINE_FORNITORE_STATUS_EDITOR_ITEMS}
      ariaLabel={`Stato ordine ${record.numero || record.id}`}
      disabled={disabled}
      title={ordineFornitoreStatusLabel(status)}
      shellClass={statoPillShellClass()}
      fallbackPillStyle={ordineFornitoreStatusPillStyle(status)}
    />
  );
}
