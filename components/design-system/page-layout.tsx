import type { ReactNode } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { dsStackPage } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

export type PageLayoutProps = {
  title: string;
  /** Evitare sottotitoli ridondanti — usare solo se necessario (accessibilità). */
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Banner / alert sopra il contenuto (dentro lo stack). */
  beforeContent?: ReactNode;
  className?: string;
};

/**
 * Layout pagina standard: titolo + azioni header + stack verticale coerente.
 */
export function PageLayout({ title, description, actions, children, beforeContent, className = "" }: PageLayoutProps) {
  return (
    <>
      <PageHeader title={title} description={description} actions={actions} />
      <div className={`${dsStackPage} ${layoutPageRoot} ${className}`.trim()}>
        {beforeContent}
        {children}
      </div>
    </>
  );
}
