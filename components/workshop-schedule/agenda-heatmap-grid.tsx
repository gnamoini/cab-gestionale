"use client";

import type { HeatmapCell } from "@/lib/workshop-schedule/intelligence/heatmap/types";
import { Tooltip } from "@/components/ui";
import { heatmapSaturationBgClass } from "@/lib/workshop-schedule/intelligence/heatmap/saturation-color";
import { DEFAULT_DAY_BOUNDS } from "@/lib/workshop-schedule/day-capacity";
import { dsAccentRowHighlight, dsFocus, dsTypoCaption } from "@/lib/ui/design-system";

export function AgendaHeatmapGrid({
  cells,
  selectedDate,
  selectedHourSlot,
  onCellClick,
}: {
  cells: readonly HeatmapCell[];
  selectedDate?: string | null;
  selectedHourSlot?: number | null;
  onCellClick?: (cell: HeatmapCell) => void;
}) {
  const dates = [...new Set(cells.map((c) => c.date))].sort();
  const hours = Array.from(
    { length: DEFAULT_DAY_BOUNDS.endHour - DEFAULT_DAY_BOUNDS.startHour },
    (_, i) => DEFAULT_DAY_BOUNDS.startHour + i,
  );

  if (dates.length === 0) {
    return <p className={`${dsTypoCaption} text-center`}>Nessun dato per la heatmap.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] p-2">
      <table className="min-w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className={`p-1.5 text-left font-semibold ${dsTypoCaption}`}>Ora</th>
            {dates.map((d) => (
              <th key={d} className={`p-1.5 font-semibold ${dsTypoCaption}`}>
                {d.slice(5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour}>
              <td className={`p-1.5 font-medium tabular-nums ${dsTypoCaption}`}>{hour}:00</td>
              {dates.map((date) => {
                const cell = cells.find((c) => c.date === date && c.hourSlot === hour);
                const saturation = cell?.saturation ?? 0;
                const selected = selectedDate === date && selectedHourSlot === hour;
                const tip = cell
                  ? `Saturazione ${saturation}% · ${cell.loadMinutes} min su ${cell.availableMinutes} disponibili`
                  : "Slot libero";
                return (
                  <td key={`${date}-${hour}`} className="p-0.5">
                    <Tooltip content={tip}>
                      <button
                        type="button"
                        aria-label={tip}
                        className={`h-7 w-full min-w-[2.25rem] rounded-md transition-transform hover:scale-105 ${heatmapSaturationBgClass(saturation)} ${dsFocus} ${
                          selected ? dsAccentRowHighlight : ""
                        }`}
                        onClick={() => cell && onCellClick?.(cell)}
                      />
                    </Tooltip>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
