"use client";

import { ShellCard } from "@/components/gestionale/shell-card";
import { reportZoneShellClass } from "@/components/report/report-ui-tokens";
import { useCollapsibleAccordionOptional } from "@/lib/ui/collapsible-accordion";
import type { ReactNode } from "react";

export function ReportAnalysisSectionShell({
  title,
  subtitle,
  children,
  persistKey,
  defaultCollapsed = false,
  accordionId: accordionIdProp,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  persistKey: string;
  defaultCollapsed?: boolean;
  /** Override accordion id; when inside CollapsibleAccordionProvider defaults to persistKey. */
  accordionId?: string;
}) {
  const accordion = useCollapsibleAccordionOptional();
  const accordionId = accordionIdProp ?? (accordion ? persistKey : undefined);

  return (
    <ShellCard
      title={title}
      subtitle={subtitle}
      collapsible
      defaultCollapsed={defaultCollapsed}
      persistScope="report"
      persistKey={persistKey}
      accordionId={accordionId}
      className={`${reportZoneShellClass} h-auto w-full self-start`}
    >
      {children}
    </ShellCard>
  );
}
