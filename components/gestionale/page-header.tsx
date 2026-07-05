import { memo, type ReactNode } from "react";
import { PageHeaderTopRow, type PageHeaderMobileBackConfig } from "@/components/gestionale/page-header-top-row";
import { dsPageDesc, dsPageHeaderShell } from "@/lib/ui/design-system";

export const PageHeader = memo(function PageHeader({
  title,
  titleMobile,
  leading,
  mobileBack,
  titleAddon,
  description,
  belowTitle,
  actions,
  topRowClassName,
}: {
  title: string;
  /** Titolo su mobile/tablet (shell compatta); es. solo «Lavorazione 26-0193». */
  titleMobile?: string;
  /** Elemento a sinistra del titolo (es. pulsante indietro) — nascosto su compact se c'è back mobile. */
  leading?: ReactNode;
  /** Back al posto dell'hamburger su mobile/tablet (default: risolto dal pathname). */
  mobileBack?: PageHeaderMobileBackConfig;
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
        <PageHeaderTopRow
          title={title}
          titleMobile={titleMobile}
          leading={leading}
          mobileBack={mobileBack}
          titleAddon={titleAddon}
          actions={actions}
          topRowClassName={topRowClassName}
        />
        {belowTitle ? <div className="min-w-0 w-full">{belowTitle}</div> : null}
        {description ? (
          <p className={`${dsPageDesc} mt-0 max-w-2xl`}>{description}</p>
        ) : null}
      </div>
    </header>
  );
});
