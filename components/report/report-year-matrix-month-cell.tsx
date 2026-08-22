"use client";

import { Tooltip } from "@/components/ui";
import { isAllowedReportManualMonth } from "@/lib/report/report-manual-entries-map";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

type ReportYearMatrixMonthCellProps = {
  monthKey: string;
  value: number;
  dbValue: number;
  isManual: boolean;
  editable: boolean;
  saving: boolean;
  onSave: (monthKey: string, next: number | null) => Promise<void>;
};

export function ReportYearMatrixMonthCell({
  monthKey,
  value,
  dbValue,
  isManual,
  editable,
  saving,
  onSave,
}: ReportYearMatrixMonthCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const canEdit = editable && isAllowedReportManualMonth(`${monthKey}-01`);

  const tooltip = isManual
    ? `${monthKey}: ${value} (override manuale · gestionale ${dbValue})`
    : dbValue > 0
      ? `${monthKey}: ${value} (gestionale)`
      : `${monthKey}: nessun dato`;

  const startEdit = useCallback(() => {
    if (!canEdit || saving) return;
    setDraft(isManual || value > 0 ? String(value) : "");
    setEditing(true);
  }, [canEdit, isManual, saving, value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = useCallback(async () => {
    if (!editing) return;
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed) {
      if (isManual) await onSave(monthKey, null);
      return;
    }
    const parsed = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) return;
    if (!isManual && parsed === dbValue) return;
    if (isManual && parsed === value) return;
    await onSave(monthKey, parsed);
  }, [dbValue, draft, editing, isManual, monthKey, onSave, value]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void commit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setEditing(false);
      }
    },
    [commit],
  );

  if (editing) {
    return (
      <td className="border-r border-[color:var(--cab-border)] px-0.5 py-1 text-center align-middle">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          disabled={saving}
          aria-label={`Modifica ${monthKey}`}
          className="h-8 w-full min-w-0 rounded border border-[color:var(--cab-primary)] bg-[var(--cab-card)] px-1 text-center text-sm tabular-nums text-[color:var(--cab-text)] outline-none ring-1 ring-[color:var(--cab-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={onKeyDown}
        />
      </td>
    );
  }

  return (
    <td
      className={`border-r border-[color:var(--cab-border)] px-0.5 py-2 text-center align-middle text-sm tabular-nums leading-tight text-[color:var(--cab-text)] ${
        canEdit ? "cursor-pointer hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,transparent)]" : ""
      } ${isManual ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-card))]" : ""}`}
      onClick={canEdit ? startEdit : undefined}
      onKeyDown={
        canEdit
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                startEdit();
              }
            }
          : undefined
      }
      tabIndex={canEdit ? 0 : undefined}
      role={canEdit ? "button" : undefined}
    >
      <Tooltip content={tooltip}>
        <span className="block w-full">
          {value > 0 ? value : <span className="text-[color:var(--cab-text-muted)]">—</span>}
        </span>
      </Tooltip>
    </td>
  );
}
