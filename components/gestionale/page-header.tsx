import { memo, type ReactNode } from "react";
import { dsPageDesc, dsPageHeaderGrid, dsPageTitle } from "@/lib/ui/design-system";
import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";

export const PageHeader = memo(function PageHeader({
  title,
  description,
  belowTitle,
  actions,
}: {
  title: string;
  description?: string;
  /** Contenuto sotto il titolo (es. selettore sezione mobile). */
  belowTitle?: ReactNode;
  actions?: ReactNode;
}) {
  const gridClass = belowTitle ? `${dsPageHeaderGrid} items-start` : dsPageHeaderGrid;
  const descriptionRowClass = belowTitle ? "row-start-3" : "row-start-2";

  return (
    <header className="mb-[length:var(--ds-space-lg)] border-b border-[color:var(--cab-border)] pb-[length:var(--ds-space-lg)] sm:mb-[length:var(--ds-space-xl)] sm:pb-[length:var(--ds-space-xl)]">
      <div className={gridClass}>
        <h1 className={`${dsPageTitle} col-start-1 row-start-1 min-w-0`}>{title}</h1>
        {actions ? (
          <div className={`${gestionalePageToolbarActionsClass} col-start-2 row-start-1`}>{actions}</div>
        ) : null}
        {belowTitle ? (
          <div className={`col-start-1 row-start-2 mt-1 min-w-0 w-full col-span-2`}>
            {belowTitle}
          </div>
        ) : null}
        {description ? (
          <p
            className={`${dsPageDesc} col-start-1 ${descriptionRowClass} mt-0 max-w-2xl ${actions ? "col-span-2 sm:col-span-1" : "col-span-2"}`}
          >
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
});
