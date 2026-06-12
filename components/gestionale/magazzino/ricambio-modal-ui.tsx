"use client";

import type { ReactNode } from "react";
import {
  GestionaleCollapsibleSection,
  gestionaleCollapsibleSectionFormClass,
  gestionaleCollapsibleSectionTitleClass,
  gestionaleCollapsibleSectionTitleClassName,
  type GestionaleCollapsibleSectionTitleTone,
} from "@/components/design-system/gestionale-collapsible-section";

/** Pannello sezione modale ricambio — alias token form collapsible (`--cab-border` via SSOT). */
export const ricambioModalSectionClass = gestionaleCollapsibleSectionFormClass;

/** Titolo sezione modale ricambio — stile unico (Identificazione, Giacenza, Foto, …). */
export const ricambioSectionTitleClassName = gestionaleCollapsibleSectionTitleClassName;

/** @deprecated Il tono non altera più lo stile: tutti i titoli sezione condividono `ricambioSectionTitleClassName`. */
export type RicambioSectionTitleTone = GestionaleCollapsibleSectionTitleTone;

export const ricambioSectionTitleClass = gestionaleCollapsibleSectionTitleClass;

export function RicambioCollapsibleSection({
  title,
  titleTone = "primary",
  defaultCollapsed = true,
  forceExpanded = false,
  className = "",
  children,
}: {
  title: string;
  titleTone?: RicambioSectionTitleTone;
  defaultCollapsed?: boolean;
  forceExpanded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <GestionaleCollapsibleSection
      title={title}
      titleTone={titleTone}
      defaultCollapsed={defaultCollapsed}
      forceExpanded={forceExpanded}
      variant="form"
      className={className}
    >
      {children}
    </GestionaleCollapsibleSection>
  );
}
