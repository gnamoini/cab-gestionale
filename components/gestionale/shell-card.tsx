"use client";

import { useId, useState, type ReactNode } from "react";
import { dsCardTitle, dsSurfaceCard, dsTypoSmall } from "@/lib/ui/design-system";
import { useCollapsibleAccordionOptional } from "@/lib/ui/collapsible-accordion";
import {
  gestionaleCollapsibleChevronBoxClass,
  gestionaleCollapsibleChevronBoxExpandedClass,
} from "@/lib/ui/gestionale-collapsible-toggle";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

/** Separatore header/contenuto senza `border-b` sul trigger (evita gap 1px in animazione collapse). */
const shellCardHeaderDivider =
  "shadow-[inset_0_-1px_0_0_var(--cab-border)]";

/** Focus visibile senza scale: il trigger header è edge-to-edge. */
const shellCardHeaderTriggerFocus =
  "outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_42%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--cab-bg-app)] dark:focus-visible:ring-offset-[var(--cab-bg-app)]";

function ShellCardChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-[transform,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        expanded
          ? "rotate-180 text-[color:var(--cab-text-muted)]"
          : "text-[color:var(--cab-text-muted)]"
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

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
  const triggerPad = compactHeader ? "min-h-10 py-2 sm:min-h-10 sm:px-4" : "";
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
          <div
            className={`flex w-full min-w-0 items-stretch bg-[var(--cab-card)] ${expanded ? shellCardHeaderDivider : ""}`}
          >
            <button
              type="button"
              id={`${panelId}-trigger`}
              aria-expanded={expanded}
              aria-controls={`${panelId}-body`}
              aria-label={toggleLabel}
              onClick={() => setCollapsed(!collapsed)}
              className={`group flex min-w-0 w-full flex-1 self-stretch items-center gap-3 bg-[var(--cab-card)] px-4 py-3 text-left touch-manipulation outline-none transition-colors duration-200 ease-out hover:bg-[var(--cab-hover)] active:bg-[var(--cab-hover)] motion-reduce:transition-none sm:min-h-[3.25rem] sm:px-5 [-webkit-tap-highlight-color:transparent] ${triggerPad} ${shellCardHeaderTriggerFocus}`}
            >
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                {title ? (
                  <h2 id={titleId} className={`${dsCardTitle} ${compactHeader ? "text-sm" : ""} leading-snug`}>
                    {title}
                  </h2>
                ) : null}
                {subtitle ? <p className={dsTypoSmall}>{subtitle}</p> : null}
              </div>
              <span
                aria-hidden
                className={`${gestionaleCollapsibleChevronBoxClass} ${
                  expanded ? gestionaleCollapsibleChevronBoxExpandedClass : ""
                }`}
              >
                <ShellCardChevron expanded={expanded} />
              </span>
            </button>
            {headerActions ? (
              <div
                className={`flex shrink-0 items-center gap-2 self-stretch bg-[var(--cab-card)] px-2 sm:px-3 ${
                  headerActionsDivider ? "border-l border-[color:var(--cab-border)]" : ""
                }`}
              >
                {headerActions}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-12 min-w-0 max-w-full items-center border-b border-[color:var(--cab-border)] px-4 py-3 sm:min-h-[3.25rem] sm:px-5">
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              {title ? <h2 className={`${dsCardTitle} leading-snug`}>{title}</h2> : null}
              {subtitle ? <p className={dsTypoSmall}>{subtitle}</p> : null}
            </div>
          </div>
        )
      ) : null}
      {collapsible ? (
        <div
          id={`${panelId}-body`}
          role="region"
          aria-labelledby={titleId}
          aria-hidden={collapsed}
          className={`grid bg-[var(--cab-card)] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
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
