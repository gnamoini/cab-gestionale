"use client";

import type { ReactNode } from "react";
import { GestionaleCollapsibleHeader } from "@/components/design-system/gestionale-collapsible-header";
import {
  gestionaleCollapsibleEase,
  gestionaleCollapsiblePanelBodyClass,
  gestionaleCollapsiblePanelInnerClass,
  gestionaleCollapsibleShellHeaderSurfaceClass,
} from "@/lib/ui/gestionale-collapsible-toggle";

/** Pannello collapsible SSOT — header (trigger + chevron) + corpo animato. */
export function GestionaleCollapsiblePanel({
  panelId,
  titleId,
  expanded,
  toggleLabel,
  onToggle,
  titleNode,
  children,
  headerActions,
  headerLeadingActions,
  headerLeadingActionsInteractive,
  compact = false,
  form = false,
  formFlat = false,
  headerActionsDivider = true,
  shellClassName = "",
  surfaceClass = gestionaleCollapsibleShellHeaderSurfaceClass,
  bodyClassName = gestionaleCollapsiblePanelBodyClass,
  bodyPadClassName = "p-4 sm:p-5",
  collapseAnimated = true,
}: {
  panelId: string;
  titleId: string;
  expanded: boolean;
  toggleLabel: string;
  onToggle: () => void;
  titleNode: ReactNode;
  children: ReactNode;
  headerActions?: ReactNode;
  headerLeadingActions?: ReactNode;
  headerLeadingActionsInteractive?: boolean;
  compact?: boolean;
  form?: boolean;
  formFlat?: boolean;
  headerActionsDivider?: boolean;
  shellClassName?: string;
  surfaceClass?: string;
  bodyClassName?: string;
  bodyPadClassName?: string;
  /** `false` fino a prefs hydrate — evita flash barra bianca su restore localStorage. */
  collapseAnimated?: boolean;
}) {
  const bodyBgClass = bodyClassName || gestionaleCollapsiblePanelBodyClass;
  const gridTransitionClass = collapseAnimated
    ? `transition-[grid-template-rows] duration-300 ${gestionaleCollapsibleEase} motion-reduce:transition-none`
    : "motion-reduce:transition-none";

  return (
    <>
      <GestionaleCollapsibleHeader
        panelId={panelId}
        titleId={titleId}
        expanded={expanded}
        toggleLabel={toggleLabel}
        onToggle={onToggle}
        titleNode={titleNode}
        headerActions={headerActions}
        headerLeadingActions={headerLeadingActions}
        headerLeadingActionsInteractive={headerLeadingActionsInteractive}
        compact={compact}
        form={form}
        formFlat={formFlat}
        headerActionsDivider={headerActionsDivider}
        shellClassName={shellClassName}
        surfaceClass={surfaceClass}
      />
      <div
        id={`${panelId}-body`}
        role="region"
        aria-labelledby={titleId}
        aria-hidden={!expanded}
        className={`grid overflow-hidden ${bodyBgClass} ${gridTransitionClass} ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className={`${gestionaleCollapsiblePanelInnerClass} ${bodyBgClass}`}>
          <div className={`min-w-0 max-w-full ${bodyPadClassName} ${bodyBgClass}`}>{children}</div>
        </div>
      </div>
    </>
  );
}
