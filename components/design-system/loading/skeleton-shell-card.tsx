"use client";

import { memo, type ReactNode } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { loadingSkeletonPulseClass } from "./loading-tokens";

/** Corpo pulse dentro ShellCard — nessun dettaglio interno simulato. */
export const skeletonShellCardPulseBodyClass = `${loadingSkeletonPulseClass} w-full`;

export type SkeletonShellCardPulseBodyProps = {
  minHeightClass: string;
  className?: string;
};

export const SkeletonShellCardPulseBody = memo(function SkeletonShellCardPulseBody({
  minHeightClass,
  className = "",
}: SkeletonShellCardPulseBodyProps) {
  return (
    <div
      className={`${skeletonShellCardPulseBodyClass} ${minHeightClass} ${className}`.trim()}
      aria-hidden
    />
  );
});

export type SkeletonShellCardProps = {
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  bodyMinHeightClass: string;
  sectionLabel?: string;
  children?: ReactNode;
  className?: string;
};

/** ShellCard reale con corpo skeleton pulse — stesso contenitore della pagina caricata. */
export const SkeletonShellCard = memo(function SkeletonShellCard({
  title,
  collapsible,
  defaultCollapsed,
  bodyMinHeightClass,
  sectionLabel,
  children,
  className = "",
}: SkeletonShellCardProps) {
  const body = children ?? <SkeletonShellCardPulseBody minHeightClass={bodyMinHeightClass} />;
  const inner = sectionLabel ? (
    <section aria-label={sectionLabel} aria-hidden>
      {body}
    </section>
  ) : (
    body
  );

  return (
    <ShellCard
      title={title}
      collapsible={collapsible}
      defaultCollapsed={defaultCollapsed}
      className={className}
    >
      {inner}
    </ShellCard>
  );
});
