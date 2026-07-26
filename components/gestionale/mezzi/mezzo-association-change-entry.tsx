"use client";

import Link from "next/link";
import {
  associationFieldLabel,
  associationTimelineTitle,
  isMezzoAssociationField,
  type MezzoAssociationField,
} from "@/lib/domain/mezzo/mezzo-association";
import { buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { dsTableActionTextBtn } from "@/lib/ui/design-system";
import type { MezzoAnagraficaHistoryRow } from "@/src/services/mezzo-anagrafica-history.service";
import { fmtMezziHubDt } from "@/components/gestionale/mezzi/mezzi-hub-ui";

export function MezzoAssociationChangeEntry({
  entry,
  onNavigate,
  asDiv = false,
}: {
  entry: MezzoAnagraficaHistoryRow;
  onNavigate?: () => void;
  asDiv?: boolean;
}) {
  const fields = (entry.changed_fields as string[]).filter((k): k is MezzoAssociationField =>
    isMezzoAssociationField(k),
  );
  const title = associationTimelineTitle(fields);
  const className = "space-y-2 border-b border-[color:var(--cab-border)] pb-3 last:border-0 last:pb-0";

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-sm font-semibold text-[color:var(--cab-text)]">{title}</p>
        <span className="text-xs text-[color:var(--cab-text-muted)]" aria-hidden>
          ·
        </span>
        <span className="text-xs text-[color:var(--cab-text-muted)]">{fmtMezziHubDt(entry.created_at)}</span>
        <span className="text-xs text-[color:var(--cab-text-muted)]" aria-hidden>
          ·
        </span>
        <span className="text-xs text-[color:var(--cab-text-muted)]">
          {entry.origine.replace(/_/g, " ")}
        </span>
        {entry.lavorazione_id ? (
          <>
            <span className="text-xs text-[color:var(--cab-text-muted)]" aria-hidden>
              ·
            </span>
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
      {entry.reason?.trim() ? (
        <p className="text-xs text-[color:var(--cab-text-muted)]">
          Motivazione: {entry.reason.trim()}
        </p>
      ) : null}
      <div className="space-y-2">
        {fields.map((key) => (
          <div
            key={key}
            className="rounded-md bg-[color:var(--cab-surface-2)]/60 px-2 py-1.5 text-sm"
          >
            <p className="text-xs font-medium text-[color:var(--cab-text-muted)]">
              {associationFieldLabel(key)}
            </p>
            <p className="text-[color:var(--cab-text)]">{entry.old_values[key] ?? "—"}</p>
            <p className="my-0.5 text-center text-xs text-[color:var(--cab-text-muted)]" aria-hidden>
              ↓
            </p>
            <p className="font-medium text-[color:var(--cab-text)]">{entry.new_values[key] ?? "—"}</p>
          </div>
        ))}
      </div>
    </>
  );

  if (asDiv) return <div className={className}>{content}</div>;
  return <li className={className}>{content}</li>;
}
