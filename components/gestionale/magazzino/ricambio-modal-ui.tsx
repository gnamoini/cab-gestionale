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

/** Stack form modale ricambio — padding laterale allineato ai bordi sezione collapsible. */
export const ricambioModalFormScrollClass = "space-y-3 !px-3 sm:!px-4 !pt-3 !pb-4";

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
  action,
  persistScope,
  persistKey,
  persist = true,
  children,
}: {
  title: string;
  titleTone?: RicambioSectionTitleTone;
  defaultCollapsed?: boolean;
  forceExpanded?: boolean;
  className?: string;
  /** Azioni header (es. unità di misura in Giacenza). */
  action?: ReactNode;
  persistScope?: string;
  persistKey?: string;
  persist?: boolean;
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
      action={action}
      persistScope={persistScope}
      persistKey={persistKey}
      persist={persist}
    >
      {children}
    </GestionaleCollapsibleSection>
  );
}
