"use client";

import { useId, useState, type ReactNode } from "react";
import { GestionaleCollapsiblePanel } from "@/components/design-system/gestionale-collapsible-panel";
import { useAuthUserId } from "@/context/auth-context";
import { dsCardTitle, dsSurfaceCard, dsTypoSmall } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useCollapsibleAccordionOptional } from "@/lib/ui/collapsible-accordion";
import {
  collapsibleCollapsedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import {
  gestionaleCollapsiblePanelBodyClass,
  gestionaleCollapsibleShellBodyPadClass,
  gestionaleCollapsibleShellBodyPadCompactClass,
} from "@/lib/ui/gestionale-collapsible-toggle";

export function ShellCard({
  title,
  subtitle,
  children,
  className = "",
  id,
  collapsible = false,
  defaultCollapsed = false,
  collapsed: collapsedProp,
  onCollapsedChange,
  headerActions,
  headerLeadingActions,
  headerLeadingActionsInteractive,
  compactContent = false,
  compactHeader = false,
  headerActionsDivider = true,
  accordionId,
  collapsibleInset = false,
  persistScope,
  persistKey,
  persist = true,
}: {
  title?: string;
  subtitle?: ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
  compactContent?: boolean;
  compactHeader?: boolean;
  headerActionsDivider?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  headerActions?: ReactNode;
  headerLeadingActions?: ReactNode;
  headerLeadingActionsInteractive?: boolean;
  accordionId?: string;
  collapsibleInset?: boolean;
  /** Scope persistenza localStorage (`gestionale-collapse-prefs:v1`). */
  persistScope?: string;
  /** Chiave sezione nello scope — se assente, stato solo in memoria. */
  persistKey?: string;
  /** `false` disabilita la persistenza anche con `persistKey` (es. archivio lavorazioni). */
  persist?: boolean;
}) {
  const panelId = useId();
  const userId = useAuthUserId();
  const accordion = useCollapsibleAccordionOptional();
  const inAccordionGroup = Boolean(collapsible && accordionId && accordion);
  const usePersistence = Boolean(
    collapsible && persistKey && persistScope && persist !== false && collapsedProp === undefined,
  );

  const [localCollapsed, setLocalCollapsed] = useState(() => defaultCollapsed);
  const [persistedCollapsed, setPersistedCollapsed, collapsePrefsHydrated] = useCollapsiblePreference(
    collapsibleCollapsedBoolPref(defaultCollapsed, {
      scope: persistScope ?? "__noop",
      key: persistKey ?? "__noop",
      userId,
      persist: usePersistence,
    }),
  );

  const collapsedState = usePersistence ? persistedCollapsed : localCollapsed;
  const collapsed = inAccordionGroup ? !accordion!.isOpen(accordionId!) : (collapsedProp ?? collapsedState);

  const setCollapsed = (next: boolean) => {
    if (inAccordionGroup) {
      if (next) {
        if (accordion!.isOpen(accordionId!)) accordion!.toggle(accordionId!);
      } else {
        accordion!.toggle(accordionId!);
      }
      onCollapsedChange?.(next);
      return;
    }

    onCollapsedChange?.(next);
    if (collapsedProp === undefined) {
      if (usePersistence) setPersistedCollapsed(next);
      else setLocalCollapsed(next);
    }
  };

  const hasHeader = Boolean(title || subtitle);
  const expanded = !collapsed;
  const bodyPad = compactContent ? "p-2 sm:p-2.5" : "p-4 sm:p-5";
  const collapseBodyPad = collapsibleInset
    ? "p-3 sm:p-4"
    : compactContent
      ? gestionaleCollapsibleShellBodyPadCompactClass
      : gestionaleCollapsibleShellBodyPadClass;
  const collapseBodyBg = collapsibleInset ? "bg-transparent" : gestionaleCollapsiblePanelBodyClass;
  const titleId = hasHeader ? `${panelId}-title` : undefined;
  const toggleLabel = title
    ? `${expanded ? "Nascondi" : "Mostra"} ${title}`
    : expanded
      ? "Nascondi sezione"
      : "Mostra sezione";

  return (
    <section
      id={id}
      className={`${dsSurfaceCard} ${layoutPageRoot} cab-shell-card ${collapsible ? "overflow-hidden" : ""} ${className}`}
    >
      {hasHeader ? (
        collapsible ? (
          <GestionaleCollapsiblePanel
            panelId={panelId}
            titleId={titleId!}
            expanded={expanded}
            toggleLabel={toggleLabel}
            onToggle={() => setCollapsed(!collapsed)}
            compact={compactHeader}
            form={collapsibleInset}
            formFlat={collapsibleInset}
            headerActionsDivider={headerActionsDivider}
            headerActions={headerActions}
            headerLeadingActions={headerLeadingActions}
            headerLeadingActionsInteractive={headerLeadingActionsInteractive}
            bodyClassName={collapseBodyBg}
            bodyPadClassName={collapseBodyPad}
            collapseAnimated={!usePersistence || collapsePrefsHydrated}
            titleNode={
              <>
                {title ? (
                  <h2 id={titleId} className={`${dsCardTitle} ${compactHeader ? "text-sm" : ""} leading-snug`}>
                    {title}
                  </h2>
                ) : null}
                {subtitle ? <p className={dsTypoSmall}>{subtitle}</p> : null}
              </>
            }
          >
            {children}
          </GestionaleCollapsiblePanel>
        ) : (
          <div className="flex min-h-12 min-w-0 max-w-full items-stretch border-b border-[color:var(--cab-border)]">
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-3 sm:min-h-[3.25rem] sm:px-5">
              {title || headerLeadingActions ? (
                <div className="flex min-w-0 items-center gap-2">
                  {title ? <h2 className={`${dsCardTitle} leading-snug`}>{title}</h2> : null}
                  {headerLeadingActions}
                </div>
              ) : null}
              {subtitle ? <p className={dsTypoSmall}>{subtitle}</p> : null}
            </div>
            {headerActions ? (
              <div
                className={`flex shrink-0 items-center gap-2 self-stretch px-2 sm:px-3 ${
                  headerActionsDivider ? "border-l border-[color:var(--cab-border)]" : ""
                }`}
              >
                {headerActions}
              </div>
            ) : null}
          </div>
        )
      ) : null}
      {!collapsible ? <div className={`min-w-0 max-w-full ${bodyPad}`}>{children}</div> : null}
    </section>
  );
}
