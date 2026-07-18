"use client";

import type { ReactNode } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { reportZoneShellClass } from "@/components/report/report-ui-tokens";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";

export function DashboardWidgetShell({
  def,
  children,
  headerActions,
  headerLeadingActions,
  headerLeadingActionsInteractive,
  title,
  subtitle,
  onCollapsedChange,
}: {
  def: DashboardWidgetDefinition;
  children: ReactNode;
  headerActions?: ReactNode;
  headerLeadingActions?: ReactNode;
  headerLeadingActionsInteractive?: boolean;
  title?: string;
  subtitle?: string;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  return (
    <ShellCard
      id={`dashboard-widget-${def.id}`}
      title={title ?? def.title}
      subtitle={subtitle ?? def.subtitle}
      collapsible
      defaultCollapsed={def.defaultCollapsed}
      persistScope="dashboard"
      persistKey={def.id}
      headerActions={headerActions}
      headerLeadingActions={headerLeadingActions}
      headerLeadingActionsInteractive={headerLeadingActionsInteractive}
      onCollapsedChange={onCollapsedChange}
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
  options?: {
    headerActions?: ReactNode;
    headerLeadingActions?: ReactNode;
    headerLeadingActionsInteractive?: boolean;
    title?: string;
    subtitle?: string;
    onCollapsedChange?: (collapsed: boolean) => void;
  },
): ReactNode {
  if (body == null || body === false) return null;
  return (
    <DashboardWidgetShell
      def={def}
      headerActions={options?.headerActions}
      headerLeadingActions={options?.headerLeadingActions}
      headerLeadingActionsInteractive={options?.headerLeadingActionsInteractive}
      title={options?.title}
      subtitle={options?.subtitle}
      onCollapsedChange={options?.onCollapsedChange}
    >
      {body}
    </DashboardWidgetShell>
  );
}
