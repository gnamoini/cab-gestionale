"use client";

import type { ReactElement } from "react";
import { dsTooltipContentMultiline } from "@/lib/ui/design-system";
import type { TooltipSide } from "@/lib/ui/tooltip-portal";
import { TooltipRichAnchor } from "./tooltip-rich-anchor";
import {
  clampTooltipStatusLines,
  tooltipStatusSummary,
  type TooltipStatusLine,
} from "./tooltip-status-model";

const TOOLTIP_STATUS_PANEL = `${dsTooltipContentMultiline} max-w-[18rem] text-left leading-snug`;

export type { TooltipStatusLine } from "./tooltip-status-model";
export { MAX_TOOLTIP_STATUS_LINES, clampTooltipStatusLines } from "./tooltip-status-model";

export type TooltipStatusProps = {
  lines: TooltipStatusLine[];
  children: ReactElement;
  side?: TooltipSide;
  disabled?: boolean;
  delayMs?: number;
  maxLines?: never;
};

/** Coppie label/value — max 6 righe (truncate safe in prod). */
export function TooltipStatus({
  lines,
  children,
  side = "top",
  disabled = false,
  delayMs,
}: TooltipStatusProps) {
  const clamped = clampTooltipStatusLines(lines);
  const summary = tooltipStatusSummary(lines);

  return (
    <TooltipRichAnchor
      summary={summary}
      side={side}
      disabled={disabled || clamped.length === 0}
      delayMs={delayMs}
      panelClassName={TOOLTIP_STATUS_PANEL}
      panel={
        <dl className="m-0 space-y-1 p-0">
          {clamped.map((line, idx) =>
            line.label ? (
              <div key={`${line.label}-${idx}`} className="flex gap-1.5">
                <dt className="shrink-0 text-[color:var(--cab-text-muted)]">{line.label}</dt>
                <dd className="m-0 min-w-0">{line.value}</dd>
              </div>
            ) : (
              <dd key={`extra-${idx}`} className="m-0 text-[color:var(--cab-text-muted)]">
                {line.value}
              </dd>
            ),
          )}
        </dl>
      }
    >
      {children}
    </TooltipRichAnchor>
  );
}
