"use client";

import Link from "next/link";
import { ReportHubAreaIcon } from "@/components/report/report-hub-area-icon";
import type { ReportHubAreaConfig } from "@/lib/report/report-hub-areas-config";
import { dsFocus } from "@/lib/ui/design-system";

const cardClass =
  `group relative flex min-h-[9.5rem] flex-col rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_42%,var(--cab-card))] p-4 shadow-[var(--cab-shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-card))] hover:shadow-[var(--cab-shadow-md)] active:scale-[0.99] ${dsFocus}`;

const iconShellClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] text-[color:var(--cab-primary)] transition-colors duration-200 group-hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] group-hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-surface))]";

export function ReportHubCard({ area }: { area: ReportHubAreaConfig }) {
  return (
    <Link href={area.href} className={cardClass} data-testid={area.testId}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className={iconShellClass}>
          <ReportHubAreaIcon areaId={area.id} />
        </span>
        <span
          className="mt-0.5 text-[color:var(--cab-text-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[color:var(--cab-primary)]"
          aria-hidden
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 4l4 4-4 4" />
          </svg>
        </span>
      </div>
      <span className="text-sm font-semibold leading-snug text-[color:var(--cab-text)]">{area.label}</span>
      <span className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
        {area.description}
      </span>
    </Link>
  );
}
