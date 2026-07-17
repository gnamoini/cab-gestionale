"use client";

import type { ReactNode } from "react";
import { GestionaleCollapsibleChevronBox } from "@/components/design-system/gestionale-collapsible-chevron";
import {
  gestionaleCollapsibleFormHeaderBtnClass,
  gestionaleCollapsibleFormHeaderRowClass,
  gestionaleCollapsibleFlatFormHeaderBtnClass,
  gestionaleCollapsibleFlatFormHeaderRowClass,
  gestionaleCollapsibleShellHeaderActionsClass,
  gestionaleCollapsibleShellHeaderActionsDividerClass,
  gestionaleCollapsibleShellHeaderBtnClass,
  gestionaleCollapsibleShellHeaderBtnCompactClass,
  gestionaleCollapsibleShellHeaderDividerClass,
  gestionaleCollapsibleShellHeaderFocusClass,
  gestionaleCollapsibleShellHeaderShellClass,
  gestionaleCollapsibleShellHeaderSurfaceClass,
  gestionaleCollapsibleShellHeaderBtnRadiusClass,
  gestionaleCollapsibleShellHeaderShellRadiusClass,
} from "@/lib/ui/gestionale-collapsible-toggle";

/** Header collapsible SSOT — stesso trigger di ShellCard Lavorazioni. */
export function GestionaleCollapsibleHeader({
  panelId,
  titleId,
  expanded,
  toggleLabel,
  onToggle,
  titleNode,
  headerActions,
  headerLeadingActions,
  headerLeadingActionsInteractive = true,
  shellClassName = "",
  compact = false,
  form = false,
  formFlat = false,
  headerActionsDivider = true,
  surfaceClass = gestionaleCollapsibleShellHeaderSurfaceClass,
}: {
  panelId: string;
  titleId: string;
  expanded: boolean;
  toggleLabel: string;
  onToggle: () => void;
  titleNode: ReactNode;
  headerActions?: ReactNode;
  /** Azioni inline accanto al titolo — fuori dal trigger per evitare button annidati. */
  headerLeadingActions?: ReactNode;
  /** `false` = click sull'area azioni propaga al trigger (es. riepilogo health score). */
  headerLeadingActionsInteractive?: boolean;
  shellClassName?: string;
  compact?: boolean;
  /** Form modale: un solo button edge-to-edge (niente wrapper shell + bleed). */
  form?: boolean;
  /** Form senza shell esterna (sfondo card base). */
  formFlat?: boolean;
  headerActionsDivider?: boolean;
  surfaceClass?: string;
}) {
  const bodyId = `${panelId}-body`;
  const showHeaderDivider = form ? (formFlat ? expanded : true) : true;
  const shellRadiusClass = form ? "" : gestionaleCollapsibleShellHeaderShellRadiusClass(expanded);
  const btnRadiusClass = form ? "" : gestionaleCollapsibleShellHeaderBtnRadiusClass(expanded);
  const dividerClass = showHeaderDivider ? gestionaleCollapsibleShellHeaderDividerClass : "";
  const compactClass = compact ? gestionaleCollapsibleShellHeaderBtnCompactClass : "";

  const btnClass = [
    gestionaleCollapsibleShellHeaderBtnClass,
    compactClass,
    dividerClass,
    btnRadiusClass,
    gestionaleCollapsibleShellHeaderFocusClass,
    form ? (formFlat ? gestionaleCollapsibleFlatFormHeaderBtnClass : gestionaleCollapsibleFormHeaderBtnClass) : surfaceClass,
    form && headerActions ? "min-w-0 flex-1 rounded-none" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const trigger = headerLeadingActions ? (
    <div
      id={`${panelId}-trigger`}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-controls={bodyId}
      aria-label={toggleLabel}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={[
        gestionaleCollapsibleShellHeaderBtnClass,
        compactClass,
        dividerClass,
        btnRadiusClass,
        gestionaleCollapsibleShellHeaderFocusClass,
        surfaceClass,
        "justify-between gap-2.5 sm:gap-3",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-3">
        {titleNode}
        <div
          className="shrink-0"
          role={headerLeadingActionsInteractive ? "presentation" : undefined}
          onPointerDown={headerLeadingActionsInteractive ? (event) => event.stopPropagation() : undefined}
          onClick={headerLeadingActionsInteractive ? (event) => event.stopPropagation() : undefined}
          onKeyDown={headerLeadingActionsInteractive ? (event) => event.stopPropagation() : undefined}
        >
          {headerLeadingActions}
        </div>
      </div>
      <GestionaleCollapsibleChevronBox expanded={expanded} />
    </div>
  ) : (
    <button
      type="button"
      id={`${panelId}-trigger`}
      aria-expanded={expanded}
      aria-controls={bodyId}
      aria-label={toggleLabel}
      onClick={onToggle}
      className={btnClass}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">{titleNode}</div>
      <GestionaleCollapsibleChevronBox expanded={expanded} />
    </button>
  );

  const actionsSlot = headerActions ? (
    <div
      className={[
        gestionaleCollapsibleShellHeaderActionsClass,
        form ? "bg-transparent" : surfaceClass,
        headerActionsDivider ? gestionaleCollapsibleShellHeaderActionsDividerClass : "",
        dividerClass,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {headerActions}
    </div>
  ) : null;

  // Form modale: niente div shell — solo button (o riga toggle+azioni).
  if (form) {
    if (headerActions) {
      return (
        <div
          className={[
            formFlat ? gestionaleCollapsibleFlatFormHeaderRowClass : gestionaleCollapsibleFormHeaderRowClass,
            dividerClass,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {trigger}
          {actionsSlot}
        </div>
      );
    }
    return trigger;
  }

  return (
    <div
      className={[
        gestionaleCollapsibleShellHeaderShellClass,
        surfaceClass,
        shellRadiusClass,
        shellClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {trigger}
      {actionsSlot}
    </div>
  );
}
