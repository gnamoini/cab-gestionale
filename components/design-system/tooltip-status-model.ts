export const MAX_TOOLTIP_STATUS_LINES = 6;

export type TooltipStatusLine = {
  label: string;
  value: string;
};

export type TooltipStatusProps = {
  lines: TooltipStatusLine[];
  /** Non overridable — oltre MAX usare Popover/Dialog */
  maxLines?: never;
};

/** ponytail: truncate in prod — dati errati non rompono UI */
export function clampTooltipStatusLines(lines: TooltipStatusLine[]): TooltipStatusLine[] {
  if (lines.length <= MAX_TOOLTIP_STATUS_LINES) return lines;
  if (process.env.NODE_ENV === "development") {
    console.error(
      `TooltipStatus exceeded max lines (${lines.length} > ${MAX_TOOLTIP_STATUS_LINES})`,
    );
  }
  return [
    ...lines.slice(0, MAX_TOOLTIP_STATUS_LINES),
    { label: "", value: "… altri dettagli" },
  ];
}

export function tooltipStatusSummary(lines: TooltipStatusLine[]): string {
  return clampTooltipStatusLines(lines)
    .map((l) => (l.label ? `${l.label}: ${l.value}` : l.value))
    .join(" · ");
}
