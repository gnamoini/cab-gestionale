
import { memo, type ReactNode } from "react";
import { dsCardTitle, dsSurfaceCard } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { loadingSkeletonPulseClass } from "./loading-tokens";

/** Corpo pulse — nessun dettaglio interno simulato. */
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
  /** @deprecated Ignorato — shell statica senza collapsible client. */
  collapsible?: boolean;
  /** @deprecated Ignorato. */
  defaultCollapsed?: boolean;
  bodyMinHeightClass: string;
  sectionLabel?: string;
  children?: ReactNode;
  className?: string;
};

/** Shell statica RSC-safe — stesso contenitore visivo di ShellCard senza hook client. */
export const SkeletonShellCard = memo(function SkeletonShellCard({
  title,
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
    <section
      className={`${dsSurfaceCard} ${layoutPageRoot} cab-shell-card min-w-0 ${className}`.trim()}
      aria-busy="true"
      aria-hidden={sectionLabel ? true : undefined}
    >
      {title ? (
        <div className="flex min-h-12 min-w-0 max-w-full border-b border-[color:var(--cab-border)] px-4 py-3 sm:min-h-[3.25rem] sm:px-5">
          <h2 className={`${dsCardTitle} leading-snug`}>{title}</h2>
        </div>
      ) : null}
      <div className="min-w-0 max-w-full p-4 sm:p-5">{inner}</div>
    </section>
  );
});
