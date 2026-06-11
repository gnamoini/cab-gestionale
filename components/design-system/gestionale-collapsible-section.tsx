"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  CAB_FOCUS_SCROLL_GROUP_ATTR,
  findGestionaleScrollContainer,
  getEffectiveVisibleBand,
  resolveFocusExtraBottom,
  resolveFocusExtraTop,
  scrollGestionaleFieldIntoView,
} from "@/lib/ui/mobile-modal-behavior";
import { dsFocus } from "@/lib/ui/design-system";

/** Pannello sezione form modale — token design system cab (ricambio, mezzi, …). */
export const gestionaleCollapsibleSectionFormClass =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-3";

/** Pannello sezione generica (fuori form ricambio). */
export const gestionaleCollapsibleSectionDefaultClass =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-3";

export const gestionaleCollapsibleSectionTitleClassName =
  "mb-2 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text)]";

export type GestionaleCollapsibleSectionVariant = "form" | "default";

export type GestionaleCollapsibleSectionTitleTone = "primary" | "operational" | "optional";

function sectionShellClass(variant: GestionaleCollapsibleSectionVariant): string {
  return variant === "form" ? gestionaleCollapsibleSectionFormClass : gestionaleCollapsibleSectionDefaultClass;
}

export function gestionaleCollapsibleSectionTitleClass(
  _tone: GestionaleCollapsibleSectionTitleTone = "primary",
): string {
  return gestionaleCollapsibleSectionTitleClassName;
}

function GestionaleCollapsibleChevron({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
        expanded ? "rotate-180" : ""
      }`}
      aria-hidden
    >
      <svg
        className="h-3.5 w-3.5 text-[color:var(--cab-text-muted)]"
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

function scrollCollapsiblePanelIntoViewIfClipped(panel: HTMLElement | null): void {
  if (!panel || typeof window === "undefined") return;

  const container = findGestionaleScrollContainer(panel);
  if (!container) return;
  const panelRect = panel.getBoundingClientRect();
  const { visibleBottom } = getEffectiveVisibleBand({
    containerRect: container.getBoundingClientRect(),
    field: panel,
  });
  if (panelRect.bottom <= visibleBottom - 8) return;

  scrollGestionaleFieldIntoView(panel, {
    behavior: "auto",
    extraTop: resolveFocusExtraTop(),
    extraBottom: resolveFocusExtraBottom(),
  });
}

export function GestionaleCollapsibleSection({
  title,
  titleTone = "primary",
  defaultCollapsed = true,
  forceExpanded = false,
  variant = "form",
  className = "",
  children,
}: {
  title: string;
  titleTone?: GestionaleCollapsibleSectionTitleTone;
  defaultCollapsed?: boolean;
  forceExpanded?: boolean;
  variant?: GestionaleCollapsibleSectionVariant;
  className?: string;
  children: ReactNode;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyInnerRef = useRef<HTMLDivElement>(null);
  const prevExpandedRef = useRef<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const expanded = forceExpanded || !collapsed;

  useEffect(() => {
    if (forceExpanded) setCollapsed(false);
  }, [forceExpanded]);

  useLayoutEffect(() => {
    const prev = prevExpandedRef.current;
    prevExpandedRef.current = expanded;
    if (prev === null || prev || !expanded) return;
    scrollCollapsiblePanelIntoViewIfClipped(bodyInnerRef.current ?? rootRef.current);
  }, [expanded]);

  return (
    <div
      ref={rootRef}
      {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
      className={`${sectionShellClass(variant)} ${className}`.trim()}
    >
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={expanded}
        aria-controls={`${panelId}-body`}
        className={`${dsFocus} group flex w-full min-w-0 items-center justify-between gap-2 rounded-[var(--ds-radius-md)] py-0.5 text-left touch-manipulation`}
        onClick={() => {
          if (forceExpanded) return;
          setCollapsed((c) => !c);
        }}
      >
        <span className={`${gestionaleCollapsibleSectionTitleClass(titleTone)} mb-0 min-w-0 flex-1`}>{title}</span>
        <GestionaleCollapsibleChevron expanded={expanded} />
      </button>
      <div
        id={`${panelId}-body`}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        aria-hidden={!expanded}
        className={`grid ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div ref={bodyInnerRef} className="min-w-0 pt-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
