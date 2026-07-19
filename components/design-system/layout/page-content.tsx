import type { ReactNode } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

export type PageContentProps = {
  children: ReactNode;
  className?: string;
  /** Marker benchmark TTUI — es. page-ready-toolbar */
  testId?: string;
};

/** Stack contenuto sotto PageHeader — non skeletonizza. */
export function PageContent({ children, className = "", testId }: PageContentProps) {
  return (
    <div
      className={`${dsStackPage} ${layoutPageRoot} ${className}`.trim()}
      {...(testId ? { "data-testid": testId } : {})}
    >
      {children}
    </div>
  );
}
