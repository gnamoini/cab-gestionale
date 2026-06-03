"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { Badge, type BadgeTone } from "@/components/design-system/badge";
import { useTooltip } from "@/components/design-system/use-tooltip";
import {
  buildReportIntegrityTooltipLines,
  deriveReportIntegrityBadgeState,
  reportIntegrityBadgeLabel,
  type ReportIntegrityBadgeView,
} from "@/lib/report/report-integrity-badge-model";
import { dsTooltipContent, dsZTooltip } from "@/lib/ui/design-system";
import { tooltipFixedStyle, tooltipTransformOrigin } from "@/lib/ui/tooltip-portal";

function badgeTone(state: ReturnType<typeof deriveReportIntegrityBadgeState>): BadgeTone {
  switch (state) {
    case "ok":
      return "ok";
    case "degraded":
      return "danger";
    case "partial":
      return "warn";
    case "drift_detected":
      return "info";
  }
}

export function ReportIntegrityStatusBadge({ view }: { view: ReportIntegrityBadgeView }) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const state = deriveReportIntegrityBadgeState(view);
  const lines = buildReportIntegrityTooltipLines(view);
  const label = reportIntegrityBadgeLabel(state);
  const tooltipSummary = lines.join(" · ");

  const { open, visible, coords, triggerProps } = useTooltip({
    content: tooltipSummary,
    side: "bottom",
    anchorRef,
    contentRef,
  });

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex min-w-0 shrink-0"
        aria-label={`Integrità dati report: ${label}. ${tooltipSummary}`}
        {...triggerProps}
      >
        <Badge tone={badgeTone(state)} className="cursor-default tracking-wide">
          {label}
        </Badge>
      </span>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={contentRef}
              role="tooltip"
              className={`${dsTooltipContent} ${dsZTooltip} pointer-events-none max-w-[18rem] whitespace-normal text-left leading-snug ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
              style={{
                ...tooltipFixedStyle(coords ?? { top: -9999, left: -9999, side: "bottom" }),
                transformOrigin: tooltipTransformOrigin(coords?.side ?? "bottom"),
              }}
            >
              <ul className="m-0 list-none space-y-1 p-0">
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
