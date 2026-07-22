"use client";

import Link from "next/link";
import { MEZZO_PERMANENT_FIELD_LABELS } from "@/lib/domain/mezzo/build-scheda-save-conflict-summary";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import { buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { dsTableActionTextBtn } from "@/lib/ui/design-system";
import type { MezzoAnagraficaHistoryRow } from "@/src/services/mezzo-anagrafica-history.service";
import { fmtMezziHubDt } from "@/components/gestionale/mezzi/mezzi-hub-ui";

export function MezzoAnagraficaHistoryEntry({
  entry,
  onNavigate,
}: {
  entry: MezzoAnagraficaHistoryRow;
  onNavigate?: () => void;
}) {
  const fields = entry.changed_fields as MezzoPermanentFieldKey[];

  return (
    <li className="space-y-2 border-b border-[color:var(--cab-border)] pb-3 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--cab-text-muted)]">
        <span>{fmtMezziHubDt(entry.created_at)}</span>
        <span aria-hidden>·</span>
        <span>{entry.origine.replace(/_/g, " ")}</span>
        {entry.lavorazione_id ? (
          <>
            <span aria-hidden>·</span>
            <Link
              href={buildPreventiviLavorazioneFocusHref(entry.lavorazione_id, "attiva")}
              className={dsTableActionTextBtn}
              onClick={onNavigate}
            >
              Lavorazione
            </Link>
          </>
        ) : null}
      </div>
      <ul className="space-y-1.5 text-sm">
        {fields.map((key) => (
          <li key={key} className="rounded-md bg-[color:var(--cab-surface-2)]/60 px-2 py-1.5">
            <p className="text-xs font-medium text-[color:var(--cab-text-muted)]">
              {MEZZO_PERMANENT_FIELD_LABELS[key] ?? key}
            </p>
            <p className="text-[color:var(--cab-text)]">
              <span className="text-[color:var(--cab-text-muted)]">Prima:</span>{" "}
              {entry.old_values[key] ?? "—"}
            </p>
            <p className="text-[color:var(--cab-text)]">
              <span className="text-[color:var(--cab-text-muted)]">Dopo:</span>{" "}
              {entry.new_values[key] ?? "—"}
            </p>
          </li>
        ))}
      </ul>
    </li>
  );
}
