"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { GestionaleCollapsiblePanel } from "@/components/design-system/gestionale-collapsible-panel";
import { dsCardTitle } from "@/lib/ui/design-system";
import { CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";

/** Sfondo shell sezione form collapsible — anche sul corpo animato (evita flash in dark). */
export const gestionaleCollapsibleSectionFormShellBgClass =
  "bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))]";

/** Shell sezione collapsible form — padding solo sul corpo, header flush. */
export const gestionaleCollapsibleSectionFormClass = `overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] ${gestionaleCollapsibleSectionFormShellBgClass}`;

/** Padding corpo sezione flat (nessuna shell). */
export const gestionaleCollapsibleSectionFlatBodyPadClass = "pt-2 pb-3";

/** Padding corpo sezione collapsible (header senza p-3). */
export const gestionaleCollapsibleSectionBodyPadClass = "px-3 pb-3";

/** Shell flat — solo spacing, niente bordo/sfondo. */
export const gestionaleCollapsibleSectionFlatClass = "min-w-0";

/** Pannello sezione generica (fuori form ricambio). */
export const gestionaleCollapsibleSectionDefaultClass = gestionaleCollapsibleSectionFormClass;

export const gestionaleCollapsibleSectionTitleClassName =
  "text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text)]";

export type GestionaleCollapsibleSectionVariant = "form" | "default" | "flat";

export type GestionaleCollapsibleSectionTitleTone = "primary" | "operational" | "optional";

function sectionBodyBgClass(variant: GestionaleCollapsibleSectionVariant): string {
  return variant === "flat" ? "" : gestionaleCollapsibleSectionFormShellBgClass;
}

function sectionShellClass(variant: GestionaleCollapsibleSectionVariant): string {
  if (variant === "flat") return gestionaleCollapsibleSectionFlatClass;
  return variant === "form" ? gestionaleCollapsibleSectionFormClass : gestionaleCollapsibleSectionDefaultClass;
}

function sectionBodyPadClass(variant: GestionaleCollapsibleSectionVariant): string {
  return variant === "flat" ? gestionaleCollapsibleSectionFlatBodyPadClass : `pt-2 ${gestionaleCollapsibleSectionBodyPadClass}`;
}

export function gestionaleCollapsibleSectionTitleClass(
  _tone: GestionaleCollapsibleSectionTitleTone = "primary",
): string {
  return gestionaleCollapsibleSectionTitleClassName;
}

export function GestionaleCollapsibleSection({
  title,
  titleTone = "primary",
  defaultCollapsed = true,
  forceExpanded = false,
  unmountOnCollapse = false,
  variant = "form",
  className = "",
  action,
  children,
}: {
  title: string;
  titleTone?: GestionaleCollapsibleSectionTitleTone;
  defaultCollapsed?: boolean;
  forceExpanded?: boolean;
  /** Se true, non monta il body quando collassato (opt-in, default false). */
  unmountOnCollapse?: boolean;
  variant?: GestionaleCollapsibleSectionVariant;
  className?: string;
  /** Azioni header (es. Aggiungi riga) — colonna separata, non toggla. */
  action?: ReactNode;
  children: ReactNode;
}) {
  const panelId = useId();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const expanded = forceExpanded || !collapsed;
  const titleId = `${panelId}-title`;
  const toggleLabel = `${expanded ? "Nascondi" : "Mostra"} ${title}`;

  useEffect(() => {
    if (forceExpanded) setCollapsed(false);
  }, [forceExpanded]);

  const toggle = () => {
    if (forceExpanded) return;
    setCollapsed((c) => !c);
  };

  const bodyBgClass = sectionBodyBgClass(variant);

  return (
    <div
      {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
      className={`${sectionShellClass(variant)} ${className}`.trim()}
    >
      <GestionaleCollapsiblePanel
        panelId={panelId}
        titleId={titleId}
        expanded={expanded}
        toggleLabel={toggleLabel}
        onToggle={toggle}
        headerActions={action}
        form={variant === "form" || variant === "flat"}
        formFlat={variant === "flat"}
        bodyClassName={bodyBgClass}
        bodyPadClassName={sectionBodyPadClass(variant)}
        titleNode={
          <h2 id={titleId} className={`${dsCardTitle} leading-snug`}>
            {title}
          </h2>
        }
      >
        {unmountOnCollapse && !expanded ? null : children}
      </GestionaleCollapsiblePanel>
    </div>
  );
}
