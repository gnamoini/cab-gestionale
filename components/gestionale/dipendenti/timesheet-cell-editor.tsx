"use client";

import { useMemo } from "react";
import { resolveTipoById } from "@/lib/dipendenti/tipi-assenza-model";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { validateCellValue } from "@/lib/dipendenti/timesheet-validation";
import { clampOre } from "@/lib/dipendenti/timesheet-totals";
import type { TimesheetCellValue } from "@/lib/dipendenti/types";
import { sliceInputValue, TEXT_MEDIUM } from "@/lib/validation/text-field-limits";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { dsInput } from "@/lib/ui/design-system";
import { gestionaleFieldLabelClass } from "@/lib/ui/gestionale-field-label";

export function TimesheetCellEditor({
  value,
  onChange,
  tipiAssenza,
  readOnly,
  compact,
}: {
  value: TimesheetCellValue;
  onChange: (next: TimesheetCellValue) => void;
  tipiAssenza: readonly TipoAssenzaConfig[];
  readOnly?: boolean;
  compact?: boolean;
}) {
  const validation = useMemo(() => validateCellValue(value, tipiAssenza), [value, tipiAssenza]);
  const selectedTipo = resolveTipoById(tipiAssenza, value.tipoAssenzaId);
  const tipoItems = useMemo(
    () => [
      { value: "", label: "— Seleziona —" },
      ...tipiAssenza.map((t) => ({ value: t.id, label: `${t.abbrev} — ${t.label}` })),
    ],
    [tipiAssenza],
  );

  const inputClass = compact ? `${dsInput} h-8 px-2 md:text-xs` : dsInput;

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-3"}`}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={gestionaleFieldLabelClass}>Ordinarie</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            step={0.5}
            disabled={readOnly}
            value={value.oreOrdinarie || ""}
            onChange={(e) => {
              const raw = e.target.value;
              const oreOrdinarie = raw === "" ? 0 : clampOre(Number(raw));
              onChange({ ...value, oreOrdinarie });
            }}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={gestionaleFieldLabelClass}>Straordinarie</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            step={0.5}
            disabled={readOnly}
            value={value.oreStraordinarie || ""}
            onChange={(e) => {
              const raw = e.target.value;
              const oreStraordinarie = raw === "" ? 0 : clampOre(Number(raw));
              onChange({ ...value, oreStraordinarie });
            }}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={gestionaleFieldLabelClass}>Assenza</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            step={0.5}
            disabled={readOnly}
            value={value.oreAssenza || ""}
            onChange={(e) => {
              const raw = e.target.value;
              const oreAssenza = raw === "" ? 0 : clampOre(Number(raw));
              onChange({
                ...value,
                oreAssenza,
                ...(oreAssenza <= 0
                  ? { tipoAssenzaId: null, tipoAssenzaLabel: "", motivoCustom: "" }
                  : {}),
              });
            }}
          />
        </div>
      </div>

      {value.oreAssenza > 0 ? (
        <div className={compact ? "grid gap-2 sm:grid-cols-2" : "space-y-3"}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={gestionaleFieldLabelClass}>Motivo assenza</span>
            <GlobalSelect
              selectOnly
              value={value.tipoAssenzaId ?? ""}
              onChange={(v) => {
                const tipo = resolveTipoById(tipiAssenza, v);
                onChange({
                  ...value,
                  tipoAssenzaId: v || null,
                  tipoAssenzaLabel: tipo?.label ?? "",
                });
              }}
              items={tipoItems}
              disabled={readOnly}
              aria-label="Tipo assenza"
            />
          </div>
          {selectedTipo?.requiresCustomText ? (
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={gestionaleFieldLabelClass}>Motivo (Altro)</span>
              <input
                className={inputClass}
                value={value.motivoCustom}
                disabled={readOnly}
                onChange={(e) => onChange({ ...value, motivoCustom: sliceInputValue(e.target.value, TEXT_MEDIUM) })}
                maxLength={TEXT_MEDIUM}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {!validation.ok ? (
        <ul className="space-y-0.5 text-xs text-rose-600 dark:text-rose-400">
          {validation.errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function timesheetCellEditorValid(value: TimesheetCellValue, tipiAssenza: readonly TipoAssenzaConfig[]): boolean {
  return validateCellValue(value, tipiAssenza).ok;
}
