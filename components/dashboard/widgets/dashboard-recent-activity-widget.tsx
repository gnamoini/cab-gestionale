"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  ControlTowerActivityDomain,
  ControlTowerActivityItem,
} from "@/lib/dashboard/control-tower-selectors";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { wrapDashboardWidget } from "@/components/dashboard/dashboard-widget-shell";
import { sanitizeLogOggettoRiga } from "@/lib/gestionale-log/log-summary";
import {
  activityFeedMetaLine,
} from "@/lib/gestionale-log/view-model";
import {
  activityFeedEventBadgeClass,
  activityFeedEventRowClass,
} from "@/lib/gestionale-log/activity-feed-event-styles";
import { reportMetricCardCompactClass } from "@/components/report/report-ui-tokens";

const ACTIVITY_EMPTY_LABEL = "Nessuna attività recente.";

type ActivityAccess = {
  canLavorazioni: boolean;
  canMagazzino: boolean;
  canPreventivi: boolean;
  canDdt: boolean;
  canFatturazione: boolean;
};

const ACTIVITY_COLUMNS: { id: ControlTowerActivityDomain; label: string; canAccess: (ctx: ActivityAccess) => boolean }[] =
  [
    { id: "lavorazioni", label: "Lavorazioni", canAccess: (c) => c.canLavorazioni },
    { id: "magazzino", label: "Magazzino", canAccess: (c) => c.canMagazzino },
    { id: "preventiviDdt", label: "Preventivi e DDT", canAccess: (c) => c.canPreventivi || c.canDdt },
    { id: "fatturazione", label: "Fatturazione", canAccess: (c) => c.canFatturazione },
  ];

function ActivityCardShell({
  label,
  empty,
  loading,
  children,
}: {
  label: string;
  empty?: boolean;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <article className={`${reportMetricCardCompactClass} flex min-h-0 min-w-0 flex-col`}>
      <h3 className="border-b border-[color:var(--cab-border)] pb-2 text-sm font-semibold text-[color:var(--cab-text)]">
        {label}
      </h3>
      {loading ? (
        <div className="mt-3 space-y-2 px-2 py-4" aria-hidden>
          <div className="h-3 w-4/5 animate-pulse rounded bg-[color:color-mix(in_srgb,var(--cab-surface-2)_70%,transparent)]" />
          <div className="h-2.5 w-3/5 animate-pulse rounded bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,transparent)]" />
          <div className="h-2.5 w-2/5 animate-pulse rounded bg-[color:color-mix(in_srgb,var(--cab-surface-2)_45%,transparent)]" />
        </div>
      ) : empty ? (
        <p className="mt-3 px-2 py-8 text-center text-xs text-[color:var(--cab-text-muted)]">{ACTIVITY_EMPTY_LABEL}</p>
      ) : (
        <ul className="mt-2 flex min-w-0 flex-1 flex-col gap-2">{children}</ul>
      )}
    </article>
  );
}

const ACTIVITY_ROW_SHELL_CLASS =
  "rounded-md border border-[color:var(--cab-border)] px-2.5 py-2 shadow-[var(--cab-shadow-sm)]";

function ActivityEntityRow({
  item,
  onOpen,
}: {
  item: ControlTowerActivityItem;
  onOpen?: () => void;
}) {
  const { vm } = item;
  const eventLabel = item.eventLabel;
  const toneClass = activityFeedEventRowClass(eventLabel);
  const toneBadge = activityFeedEventBadgeClass(eventLabel);
  const metaLine = activityFeedMetaLine(vm, item.eventCount);
  const Shell = onOpen ? "button" : "div";
  const shellProps = onOpen
    ? ({
        type: "button" as const,
        onClick: onOpen,
        className:
          `w-full text-left transition-colors hover:bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_42%,transparent)] ${ACTIVITY_ROW_SHELL_CLASS} ${toneClass}`,
      })
    : ({
        className: `${ACTIVITY_ROW_SHELL_CLASS} ${toneClass}`,
      });

  return (
    <li className="list-none">
      <Shell {...shellProps}>
        <p className="min-w-0 truncate text-sm font-medium leading-snug text-[color:var(--cab-text)]">
          {sanitizeLogOggettoRiga(vm.oggettoRiga)}
        </p>
        <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
          <span
            className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${toneBadge}`}
          >
            {eventLabel}
          </span>
          <span className="min-w-0 truncate text-right text-[10px] tabular-nums text-[color:var(--cab-text-muted)]">
            {metaLine}
          </span>
        </div>
      </Shell>
    </li>
  );
}

export function DashboardRecentActivityWidget({ def }: { def: DashboardWidgetDefinition }) {
  const router = useRouter();
  const {
    slices,
    staging,
    activityFeedLoading,
    canLavorazioni,
    canMagazzino,
    canPreventivi,
    canDdt,
    canFatturazione,
  } = useControlTowerContext();
  if (staging) return null;

  const access: ActivityAccess = {
    canLavorazioni,
    canMagazzino,
    canPreventivi,
    canDdt,
    canFatturazione,
  };
  const feed = slices?.activityFeed;
  const columns = ACTIVITY_COLUMNS.filter((col) => col.canAccess(access));

  if (columns.length === 0) return null;

  const body = (
    <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => {
        const items = feed?.byDomain[col.id] ?? [];
        const empty = !activityFeedLoading && items.length === 0;
        return (
          <ActivityCardShell key={col.id} label={col.label} empty={empty} loading={activityFeedLoading}>
            {items.map((item) => (
              <ActivityEntityRow
                key={item.id}
                item={item}
                onOpen={item.href ? () => router.push(item.href!) : undefined}
              />
            ))}
          </ActivityCardShell>
        );
      })}
    </div>
  );

  return wrapDashboardWidget(def, body);
}
