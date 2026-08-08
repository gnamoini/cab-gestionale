import type { ReactNode } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { contentRevealClass } from "@/components/design-system/loading/loading-tokens";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

export type PageContentProps = {
  children: ReactNode;
  className?: string;
  /** Marker benchmark TTUI — es. page-ready-toolbar */
  testId?: string;
  /** Fade-in L1/L2 — opt-in; vietato su route con SkeletonBoundary L3 (vedi loading-policy). */
  contentReveal?: boolean;
};

/** Stack contenuto sotto PageHeader — non skeletonizza. */
export function PageContent({
  children,
  className = "",
  testId,
  contentReveal = false,
}: PageContentProps) {
  const revealClass = contentReveal ? contentRevealClass : "";
  return (
    <div
      className={`${dsStackPage} ${layoutPageRoot} ${revealClass} ${className}`.trim()}
      {...(testId ? { "data-testid": testId } : {})}
      {...(contentReveal ? { "data-content-reveal": "page" } : {})}
    >
      {children}
    </div>
  );
}
