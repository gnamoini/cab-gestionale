"use client";



import { useId, useState, type ReactNode } from "react";

import { GestionaleCollapsibleHeader } from "@/components/design-system/gestionale-collapsible-header";

import { dsCardTitle, dsSurfaceCard, dsTypoSmall } from "@/lib/ui/design-system";

import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

import { useCollapsibleAccordionOptional } from "@/lib/ui/collapsible-accordion";

import {
  gestionaleCollapsibleEase,
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

  /** Padding ridotto nel corpo (elenchi impostazioni annidati). */

  compactContent = false,

  /** Header compatto (titolo + azioni su una riga bassa). */

  compactHeader = false,

  /** Separatore verticale tra titolo e `headerActions` (disabilitare in gerarchie impostazioni). */

  headerActionsDivider = true,

  /** Con `CollapsibleAccordionProvider`: aprire questa card chiude le altre del gruppo. */

  accordionId,

}: {

  title?: string;

  subtitle?: ReactNode;

  children: React.ReactNode;

  className?: string;

  id?: string;

  compactContent?: boolean;

  compactHeader?: boolean;

  headerActionsDivider?: boolean;

  /** Header cliccabile (titolo + chevron) per espandere/collassare. */

  collapsible?: boolean;

  /** Solo se `collapsible`: partenza compressa. */

  defaultCollapsed?: boolean;

  collapsed?: boolean;

  onCollapsedChange?: (collapsed: boolean) => void;

  /** Azioni in header (es. «Dati storici»): non attivano il toggle collapse. */

  headerActions?: ReactNode;

  accordionId?: string;

}) {

  const panelId = useId();

  const accordion = useCollapsibleAccordionOptional();

  const inAccordionGroup = Boolean(collapsible && accordionId && accordion);

  const [collapsedState, setCollapsedState] = useState(() => defaultCollapsed);

  const collapsed = inAccordionGroup

    ? !accordion!.isOpen(accordionId!)

    : (collapsedProp ?? collapsedState);



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

    if (collapsedProp === undefined) setCollapsedState(next);

  };



  const hasHeader = Boolean(title || subtitle);

  const expanded = !collapsed;

  const bodyPad = compactContent ? "p-2 sm:p-2.5" : "p-4 sm:p-5";

  const titleId = hasHeader ? `${panelId}-title` : undefined;

  const toggleLabel = title

    ? `${expanded ? "Nascondi" : "Mostra"} ${title}`

    : expanded

      ? "Nascondi sezione"

      : "Mostra sezione";



  return (

    <section id={id} className={`${dsSurfaceCard} ${layoutPageRoot} cab-shell-card ${className}`}>

      {hasHeader ? (

        collapsible ? (

          <GestionaleCollapsibleHeader

            panelId={panelId}

            titleId={titleId!}

            expanded={expanded}

            toggleLabel={toggleLabel}

            onToggle={() => setCollapsed(!collapsed)}

            compact={compactHeader}

            headerActionsDivider={headerActionsDivider}

            headerActions={headerActions}

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

          />

        ) : (

          <div className="flex min-h-12 min-w-0 max-w-full items-stretch border-b border-[color:var(--cab-border)]">

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-3 sm:min-h-[3.25rem] sm:px-5">

              {title ? <h2 className={`${dsCardTitle} leading-snug`}>{title}</h2> : null}

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

      {collapsible ? (

        <div

          id={`${panelId}-body`}

          role="region"

          aria-labelledby={titleId}

          aria-hidden={collapsed}

          className={`grid bg-[var(--cab-card)] transition-[grid-template-rows] duration-300 ${gestionaleCollapsibleEase} motion-reduce:transition-none ${

            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"

          }`}

        >

          <div className="min-h-0 overflow-hidden bg-[var(--cab-card)]">

            <div className={`min-w-0 max-w-full ${bodyPad}`}>{children}</div>

          </div>

        </div>

      ) : (

        <div className={`min-w-0 max-w-full ${bodyPad}`}>{children}</div>

      )}

    </section>

  );

}


