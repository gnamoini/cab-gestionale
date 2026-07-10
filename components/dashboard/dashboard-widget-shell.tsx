"use client";

import type { ReactNode } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { reportZoneShellClass } from "@/components/report/report-ui-tokens";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";

export function DashboardWidgetShell({
  def,
  children,
  headerActions,
}: {
  def: DashboardWidgetDefinition;
  children: ReactNode;
  headerActions?: ReactNode;
}) {
  return (
    <ShellCard
      id={`dashboard-widget-${def.id}`}
      title={def.title}
      subtitle={def.subtitle}
      collapsible
      defaultCollapsed={def.defaultCollapsed}
      persistScope="dashboard"
      persistKey={def.id}
      headerActions={headerActions}
      className={reportZoneShellClass}
    >
      {children}
    </ShellCard>
  );
}

/** Null-safe wrapper — nessuna shell se il corpo è assente. */
export function wrapDashboardWidget(
  def: DashboardWidgetDefinition,
  body: ReactNode | null | false,
  headerActions?: ReactNode,
): ReactNode {
  if (body == null || body === false) return null;
  return (
    <DashboardWidgetShell def={def} headerActions={headerActions}>
      {body}
    </DashboardWidgetShell>
  );
}
