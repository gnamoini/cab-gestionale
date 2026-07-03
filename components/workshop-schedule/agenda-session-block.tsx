"use client";

import { Tooltip, TruncatedTextTooltip } from "@/components/design-system";
import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import { PLANNING_STATUS_LABELS } from "@/lib/workshop-schedule/types";
import {
  EVENT_TYPE_LABELS,
  PLANNING_STATUS_BADGE_CLASS,
  PRIORITY_LABELS,
} from "@/lib/workshop-schedule/agenda-ui-labels";
import { localTimeLabel } from "@/lib/workshop-schedule/datetime";
import { resolveSessionVisualTokens } from "@/lib/workshop-schedule/visual-tokens";
import { dsAccentRowHighlight, dsFocus } from "@/lib/ui/design-system";

export function AgendaSessionBlock({
  session,
  compact = false,
  selected = false,
  onClick,
}: {
  session: WorkshopScheduleSessionView;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const tokens = resolveSessionVisualTokens({
    eventType: session.eventType,
    priority: session.priority,
    planningStatus: session.planningStatus,
  });
  const wo = session.workOrder;
  const subtitle = wo
    ? [wo.codice, wo.cliente, wo.targa].filter(Boolean).join(" · ")
    : session.eventType === "blocco_agenda"
      ? session.blockType ?? "Blocco"
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[var(--ds-radius-lg)] border px-2.5 py-2 text-left text-xs shadow-[var(--cab-shadow-sm)] transition-[box-shadow,transform,border-color] duration-150 hover:shadow-[var(--cab-shadow-md)] ${tokens.bgClass} ${tokens.borderClass} ${dsFocus} ${
        selected ? `${dsAccentRowHighlight} ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]` : ""
      } ${compact ? "py-1.5" : ""}`}
    >
      <div className="flex items-start gap-2">
        <Tooltip content={PLANNING_STATUS_LABELS[session.planningStatus]}>
          <span className="mt-0.5 shrink-0 text-sm font-bold" aria-hidden>
            {tokens.statusIcon}
          </span>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <TruncatedTextTooltip
              text={session.title}
              className="min-w-0 flex-1 truncate font-semibold text-[color:var(--cab-text)]"
            />
            <span className="shrink-0 tabular-nums text-[11px] font-medium text-[color:var(--cab-text-muted)]">
              {localTimeLabel(session.startAt)}–{localTimeLabel(session.endAt)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className={PLANNING_STATUS_BADGE_CLASS[session.planningStatus]}>
              {PLANNING_STATUS_LABELS[session.planningStatus]}
            </span>
            <span className="rounded-full bg-[var(--cab-surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
              {EVENT_TYPE_LABELS[session.eventType]}
            </span>
            {session.priority ? (
              <span className="rounded-full bg-[var(--cab-surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                {PRIORITY_LABELS[session.priority]}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <TruncatedTextTooltip
              text={subtitle}
              className="mt-1 truncate text-[10px] text-[color:var(--cab-text-muted)]"
            />
          ) : null}
        </div>
      </div>
    </button>
  );
}
