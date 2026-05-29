"use client";

import { ShellCard } from "@/components/gestionale/shell-card";
import { dsStackPage, dsTypoSmall } from "@/lib/ui/design-system";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { gestionaleModuleLabel } from "@/src/lib/ux/gestionale-module-labels";

export function GestionaleAccessLimited({
  module,
  title = "Accesso limitato",
  description,
}: {
  module?: GestionalePermissionModule;
  title?: string;
  description?: string;
}) {
  const section = module ? gestionaleModuleLabel(module) : null;
  const body =
    description ??
    (section
      ? `Non hai i permessi per visualizzare la sezione ${section}.`
      : "Non hai i permessi per visualizzare questa sezione.");

  return (
    <div className={dsStackPage}>
      <ShellCard title={title}>
        <p className={dsTypoSmall}>{body}</p>
        <p className={`mt-3 ${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
          Se pensi si tratti di un errore, contatta un amministratore del gestionale.
        </p>
      </ShellCard>
    </div>
  );
}
