import { memo, type ReactNode } from "react";
import { dsPageDesc, dsPageTitle } from "@/lib/ui/design-system";
import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";

export const PageHeader = memo(function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-[length:var(--ds-space-lg)] border-b border-[color:var(--cab-border)] pb-[length:var(--ds-space-lg)] sm:mb-[length:var(--ds-space-xl)] sm:pb-[length:var(--ds-space-xl)]">
      <div className="flex flex-col gap-[length:var(--ds-space-md)] sm:flex-row sm:items-start sm:justify-between sm:gap-[length:var(--ds-space-lg)]">
        <div className="min-w-0 flex-1">
          <h1 className={dsPageTitle}>{title}</h1>
          {description ? <p className={dsPageDesc}>{description}</p> : null}
        </div>
        {actions ? <div className={gestionalePageToolbarActionsClass}>{actions}</div> : null}
      </div>
    </header>
  );
});
