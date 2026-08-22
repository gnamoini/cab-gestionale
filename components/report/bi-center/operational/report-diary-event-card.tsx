"use client";

import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";

export function ReportDiaryEventCard({ event }: { event: ReportOperationalEvent }) {
  return (
    <li className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:color-mix(in_srgb,var(--cab-primary)_25%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_4%,var(--cab-card))] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-primary)]">
        Nota operativa
      </p>
      <p className="mt-1 text-sm text-[color:var(--cab-text)]">{event.title}</p>
      <time className="mt-1 block text-xs text-[color:var(--cab-text-muted)]">
        {event.timestamp.slice(0, 10)}
      </time>
    </li>
  );
}
