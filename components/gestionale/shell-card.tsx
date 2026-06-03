"use client";

import { useId, useState, type ReactNode } from "react";
import { dsCardTitle, dsSurfaceCard, dsTypoSmall } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

/** Separatore header/contenuto senza `border-b` sul trigger (evita gap 1px in animazione collapse). */
const shellCardHeaderDivider =
  "shadow-[inset_0_-1px_0_0_var(--cab-border)]";

const shellCardTriggerFocus =
  "outline-none select-none touch-manipulation focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_42%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--cab-bg-app)] dark:focus-visible:ring-offset-[var(--cab-bg-app)]";

const shellCardTriggerClass = [
  "group flex w-full min-h-12 min-w-0 items-center gap-3 bg-[var(--cab-card)] px-4 py-3 text-left",
  "transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
  "hover:bg-[color:color-mix(in_srgb,var(--cab-hover)_65%,transparent)]",
  "active:bg-[color:color-mix(in_srgb,var(--cab-hover)_88%,var(--cab-card))]",
  "sm:min-h-[3.25rem] sm:px-5",
  shellCardTriggerFocus,
].join(" ");

function ShellCardChevron({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-[var(--ds-radius-lg)] border transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none group-active:scale-[0.9] group-active:duration-100 ${
        expanded
          ? "border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_75%,var(--cab-card))] shadow-[var(--cab-shadow-sm)] group-active:shadow-none"
          : "border-transparent bg-transparent group-hover:border-[color:var(--cab-border)] group-hover:bg-[var(--cab-hover)] group-active:border-[color:var(--cab-border)] group-active:bg-[color:color-mix(in_srgb,var(--cab-hover)_90%,var(--cab-card))]"
      }`}
      aria-hidden
    >
      <svg
        className={`h-4 w-4 shrink-0 transition-[transform,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          expanded
            ? "rotate-180 text-[color:var(--cab-text-muted)]"
            : "text-[color:var(--cab-text-muted)] group-hover:text-[color:var(--cab-text)] group-active:text-[color:var(--cab-text)]"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
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
}: {
  title?: string;
  subtitle?: ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
  compactContent?: boolean;
  compactHeader?: boolean;
  headerActionsDivider?: boolean;
  /** Header cliccabile per mostrare/nascondere il contenuto. */
  collapsible?: boolean;
  /** Solo se `collapsible`: partenza compressa. */
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Azioni in header (es. «Dati storici»): non attivano il toggle collapse. */
  headerActions?: ReactNode;
}) {
  const panelId = useId();
  const [collapsedState, setCollapsedState] = useState(() => defaultCollapsed);
  const collapsed = collapsedProp ?? collapsedState;

  const setCollapsed = (next: boolean) => {
    onCollapsedChange?.(next);
    if (collapsedProp === undefined) setCollapsedState(next);
  };

  const hasHeader = Boolean(title || subtitle);
  const expanded = !collapsed;
  const bodyPad = compactContent ? "p-2 sm:p-2.5" : "p-4 sm:p-5";
  const triggerPad = compactHeader ? "min-h-10 py-2 sm:min-h-10 sm:px-4" : "";

  return (
    <section id={id} className={`${dsSurfaceCard} ${layoutPageRoot} overflow-hidden ${className}`}>
      {hasHeader ? (
        collapsible ? (
          <div
            className={`flex w-full min-w-0 items-stretch ${expanded ? shellCardHeaderDivider : ""}`}
          >
            <button
              type="button"
              id={`${panelId}-trigger`}
              aria-expanded={expanded}
              aria-controls={`${panelId}-body`}
              onClick={() => setCollapsed(!collapsed)}
              className={`${shellCardTriggerClass} min-w-0 flex-1 rounded-none ${triggerPad}`}
            >
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                {title ? (
                  <h2 className={`${dsCardTitle} ${compactHeader ? "text-sm" : ""} leading-snug`}>{title}</h2>
                ) : null}
                {subtitle ? <p className={dsTypoSmall}>{subtitle}</p> : null}
              </div>
              <ShellCardChevron expanded={expanded} />
            </button>
            {headerActions ? (
              <div
                className={`flex shrink-0 items-center gap-2 self-stretch bg-[var(--cab-card)] px-2 sm:px-3 ${
                  headerActionsDivider ? "border-l border-[color:var(--cab-border)]" : ""
                }`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
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
          aria-labelledby={hasHeader ? `${panelId}-trigger` : undefined}
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
