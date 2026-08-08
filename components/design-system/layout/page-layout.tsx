import type { ReactNode } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { PageContent } from "./page-content";

export type PageLayoutProps = {
  title: string;
  titleMobile?: string;
  titleAddon?: ReactNode;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Banner / alert sopra il contenuto (dentro PageContent). */
  beforeContent?: ReactNode;
  className?: string;
  /** Marker benchmark TTUI sullo stack contenuto */
  contentTestId?: string;
  /** Fade-in navigazione — opt-in; non usare con SkeletonBoundary sulla stessa route. */
  contentReveal?: boolean;
};

/**
 * Layout pagina standard: PageHeader reale (fuori skeleton boundary) + PageContent.
 */
export function PageLayout({
  title,
  titleMobile,
  titleAddon,
  description,
  actions,
  children,
  beforeContent,
  className = "",
  contentTestId,
  contentReveal = false,
}: PageLayoutProps) {
  return (
    <>
      <PageHeader
        title={title}
        titleMobile={titleMobile}
        titleAddon={titleAddon}
        description={description}
        actions={actions}
      />
      <PageContent className={className} testId={contentTestId} contentReveal={contentReveal}>
        {beforeContent}
        {children}
      </PageContent>
    </>
  );
}

export { PageContent } from "./page-content";
export { PageSection, type PageSectionProps } from "./page-section";
