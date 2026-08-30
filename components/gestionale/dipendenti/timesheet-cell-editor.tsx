"use client";

import { useMemo } from "react";
import { resolveTipoById } from "@/lib/dipendenti/tipi-assenza-model";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { validateCellValue } from "@/lib/dipendenti/timesheet-validation";
import { clampOre } from "@/lib/dipendenti/timesheet-totals";
import type { TimesheetCellValue } from "@/lib/dipendenti/types";
import { sliceInputValue, TEXT_MEDIUM } from "@/lib/validation/text-field-limits";
import { dsDisabled, dsFocus, dsInput, gestionaleFilterChipClass } from "@/lib/ui/design-system";
import { gestionaleFieldLabelClass } from "@/lib/ui/gestionale-field-label";
import { Tooltip } from "@/components/ui";

function tipoAssenzaChipClass(selected: boolean): string {
  return selected
    ? `${gestionaleFilterChipClass} w-full min-w-0 justify-start border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]`
    : `${gestionaleFilterChipClass} w-full min-w-0 justify-start text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]`;
}

function TimesheetTipoAssenzaPicker({
  tipiAssenza,
  selectedId,
  onSelect,
  readOnly,
  compact,
}: {
  tipiAssenza: readonly TipoAssenzaConfig[];
  selectedId: string | null;
  onSelect: (tipo: TipoAssenzaConfig) => void;
  readOnly?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Tipo assenza"
      className={`grid min-w-0 gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
    >
      {tipiAssenza.map((tipo) => {
        const selected = selectedId === tipo.id;
        return (
          <Tooltip key={tipo.id} content={tipo.label}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              className={`${tipoAssenzaChipClass(selected)} ${dsFocus} ${dsDisabled}`}
              onClick={() => onSelect(tipo)}
            >
            <span className="shrink-0 font-bold tabular-nums text-[color:var(--cab-primary)]">
              {tipo.abbrev}
            </span>
            <span className="min-w-0 truncate">{tipo.label}</span>
          </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

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
        <div className={compact ? "space-y-2" : "space-y-3"}>
          <div className="flex min-w-0 flex-col gap-1">
            <span className={gestionaleFieldLabelClass}>Motivo assenza</span>
            <TimesheetTipoAssenzaPicker
              tipiAssenza={tipiAssenza}
              selectedId={value.tipoAssenzaId}
              readOnly={readOnly}
              compact={compact}
              onSelect={(tipo) => {
                onChange({
                  ...value,
                  tipoAssenzaId: tipo.id,
                  tipoAssenzaLabel: tipo.label,
                });
              }}
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
