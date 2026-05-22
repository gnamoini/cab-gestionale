import { memo, type ReactNode } from "react";
import { dsPageDesc, dsPageHeaderTopRow, dsPageTitle, dsPageTitleToolbarAlign } from "@/lib/ui/design-system";
import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";

export const PageHeader = memo(function PageHeader({
  title,
  description,
  belowTitle,
  actions,
  topRowClassName,
}: {
  title: string;
  description?: string;
  /** Contenuto sotto il titolo (es. selettore sezione mobile). */
  belowTitle?: ReactNode;
  actions?: ReactNode;
  /** Classi aggiuntive sulla riga titolo + azioni (es. layout compatto mobile). */
  topRowClassName?: string;
}) {
  return (
    <header className="mb-[length:var(--ds-space-lg)] border-b border-[color:var(--cab-border)] pb-[length:var(--ds-space-lg)] sm:mb-[length:var(--ds-space-xl)] sm:pb-[length:var(--ds-space-xl)]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className={`${dsPageHeaderTopRow}${topRowClassName ? ` ${topRowClassName}` : ""}`}>
          <div className="flex min-w-[min(100%,12rem)] max-w-full flex-1 items-center ps-1 sm:ps-1 md:ps-0">
            <h1 className={`${dsPageTitle} ${dsPageTitleToolbarAlign} min-w-0 break-words`}>{title}</h1>
          </div>
          {actions ? (
            <div className={`${gestionalePageToolbarActionsClass} ms-auto`}>{actions}</div>
          ) : null}
        </div>
        {belowTitle ? <div className="min-w-0 w-full">{belowTitle}</div> : null}
        {description ? (
          <p className={`${dsPageDesc} mt-0 max-w-2xl`}>{description}</p>
        ) : null}
      </div>
    </header>
  );
});
