"use client";

import type { ReactNode } from "react";
import { GestionaleAccessLimited } from "@/components/gestionale/gestionale-access-limited";
import { ShellCard } from "@/components/gestionale/shell-card";
import { dsStackPage, dsTypoSmall } from "@/lib/ui/design-system";
import { usePermissions } from "@/src/hooks/use-permissions";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

function GestionaleSectionLoading() {
  return (
    <div className={dsStackPage}>
      <ShellCard title="Caricamento">
        <p className={dsTypoSmall}>Caricamento dati…</p>
      </ShellCard>
    </div>
  );
}

/**
 * Mostra fallback coerente se l&apos;utente non può leggere il modulo; evita errori tecnici o pagine vuote.
 */
export function GestionaleSectionGate({
  module,
  children,
}: {
  module: GestionalePermissionModule;
  children: ReactNode;
}) {
  const perm = usePermissions(module);

  if (perm.isLoading) return <GestionaleSectionLoading />;
  if (!perm.canRead) return <GestionaleAccessLimited module={module} />;

  return <>{children}</>;
}
