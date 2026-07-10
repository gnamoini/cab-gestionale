"use client";

import { Tooltip } from "@/components/ui";
import {
  buildLayerCellDisplayContent,
  cellDisplayKindForLayer,
  CELL_EMPTY_BASE_CLASS,
  CELL_EMPTY_HOVER_ABSENCE,
  CELL_EMPTY_HOVER_WORK,
  CELL_EMPTY_WEEKEND_CLASS,
  CELL_KIND_CLASS,
  CELL_SECONDARY_TONE_CLASS,
  type TimesheetCellLayer,
} from "@/lib/dipendenti/timesheet-cell-display";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type { TimesheetCellValue } from "@/lib/dipendenti/types";

const CELL_INTERACTION =
  "cursor-pointer transition-[filter,opacity] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60";

const CELL_BUTTON_LAYOUT =
  "box-border block h-full min-h-9 w-full rounded-none border-0 bg-transparent shadow-none";

export function DipendentiTimesheetCompactCell({
  value,
  tipiAssenza,
  layer = "work",
  isWeekend = false,
  disabled,
  onClick,
  tooltipLabel,
}: {
  value: TimesheetCellValue;
  tipiAssenza: readonly TipoAssenzaConfig[];
  layer?: TimesheetCellLayer;
  isWeekend?: boolean;
  disabled?: boolean;
  onClick: () => void;
  tooltipLabel: string;
}) {
  const content = buildLayerCellDisplayContent(value, tipiAssenza, layer);
  const kind = cellDisplayKindForLayer(value, layer);
  const isEmpty = kind === "empty";
  const emptyHover = layer === "absence" ? CELL_EMPTY_HOVER_ABSENCE : CELL_EMPTY_HOVER_WORK;
  const kindClass = isEmpty
    ? `${isWeekend ? CELL_EMPTY_WEEKEND_CLASS : CELL_EMPTY_BASE_CLASS} ${emptyHover}`
    : CELL_KIND_CLASS[kind];
  const ariaLabel = tooltipLabel.replace(/\n/g, " — ");
  const secondaryClass = content.secondaryTone
    ? CELL_SECONDARY_TONE_CLASS[content.secondaryTone]
    : CELL_SECONDARY_TONE_CLASS.neutral;

  return (
    <Tooltip content={tooltipLabel} multiline side="top" showOnFocus={false} delayMs={220}>
      <button
        type="button"
        data-timesheet-cell=""
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={onClick}
        data-timesheet-cell-empty={isEmpty ? "" : undefined}
        data-timesheet-cell-kind={isEmpty ? undefined : kind}
        className={`group/cell flex ${CELL_BUTTON_LAYOUT} min-w-0 items-center justify-center px-0 py-0 text-[11px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_40%,transparent)] ${CELL_INTERACTION} ${kindClass}`}
      >
      {isEmpty ? (
        <span
          className="pointer-events-none flex size-[1.125rem] items-center justify-center rounded-none text-[11px] font-medium leading-none text-[color:var(--cab-text-muted)] opacity-[0.2] transition-opacity duration-150 group-hover/cell:opacity-65 group-focus-visible/cell:opacity-65"
          aria-hidden
        >
          +
        </span>
      ) : content.primary ? (
        content.secondary ? (
          <span className="flex min-w-0 max-w-full flex-col items-center overflow-hidden leading-none">
            <span className="max-w-full truncate text-[11px] font-bold">{content.primary}</span>
            <span
              className={`mt-0.5 max-w-full truncate text-[9px] font-semibold uppercase tracking-wide ${secondaryClass}`}
            >
              {content.secondary}
            </span>
          </span>
        ) : (
          <span className="truncate">{content.primary}</span>
        )
      ) : null}
      </button>
    </Tooltip>
  );
}
