"use client";

import type { ReactElement } from "react";
import { dsTooltipContentMultiline } from "@/lib/ui/design-system";
import type { TooltipSide } from "@/lib/ui/tooltip-portal";
import { TooltipRichAnchor } from "./tooltip-rich-anchor";

const TOOLTIP_LIST_PANEL = `${dsTooltipContentMultiline} max-w-[18rem] text-left leading-snug`;

export type TooltipListProps = {
  items: string[];
  children: ReactElement;
  side?: TooltipSide;
  disabled?: boolean;
  delayMs?: number;
};

/** Elenco puntato in tooltip — solo testo, no interazione. */
export function TooltipList({
  items,
  children,
  side = "top",
  disabled = false,
  delayMs,
}: TooltipListProps) {
  const filtered = items.map((i) => i.trim()).filter(Boolean);
  const summary = filtered.join(" · ");

  return (
    <TooltipRichAnchor
      summary={summary}
      side={side}
      disabled={disabled || filtered.length === 0}
      delayMs={delayMs}
      panelClassName={TOOLTIP_LIST_PANEL}
      panel={
        <ul className="m-0 list-none space-y-1 p-0">
          {filtered.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      }
    >
      {children}
    </TooltipRichAnchor>
  );
}
