import { memo, type ReactNode } from "react";
import { dsPageDesc, dsPageHeaderShell, dsPageHeaderTopRow, dsPageTitle, dsPageTitleToolbarAlign } from "@/lib/ui/design-system";
import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";

export const PageHeader = memo(function PageHeader({
  title,
  leading,
  titleAddon,
  description,
  belowTitle,
  actions,
  topRowClassName,
}: {
  title: string;
  /** Elemento a sinistra del titolo (es. pulsante indietro). */
  leading?: ReactNode;
  /** Elemento inline accanto al titolo (es. badge stato). */
  titleAddon?: ReactNode;
  description?: string;
  /** Contenuto sotto il titolo (es. selettore sezione mobile). */
  belowTitle?: ReactNode;
  actions?: ReactNode;
  /** Classi aggiuntive sulla riga titolo + azioni (es. layout compatto mobile). */
  topRowClassName?: string;
}) {
  return (
    <header className={dsPageHeaderShell}>
      <div className="flex min-w-0 flex-col gap-3">
        <div className={`${dsPageHeaderTopRow} cab-page-header-top-row${topRowClassName ? ` ${topRowClassName}` : ""}`}>
          <div className="flex min-w-0 max-w-full flex-1 items-center gap-2 ps-1 sm:ps-1 md:ps-0">
            {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}
            <h1 className={`${dsPageTitle} ${dsPageTitleToolbarAlign} min-w-0 break-words`}>{title}</h1>
            {titleAddon ? <div className="flex shrink-0 items-center">{titleAddon}</div> : null}
          </div>
          {actions ? (
            <div className={`${gestionalePageToolbarActionsClass} ms-auto shrink-0`}>{actions}</div>
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
