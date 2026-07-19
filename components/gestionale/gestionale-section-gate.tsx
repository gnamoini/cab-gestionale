"use client";

import { useEffect, type ReactNode } from "react";
import { GestionaleAccessLimited } from "@/components/gestionale/gestionale-access-limited";
import { LoadingErrorState, LoadingPageSkeleton } from "@/components/design-system";
import { dsStackPage } from "@/lib/ui/design-system";
import { SECTION_LOADING_FAILSAFE_MS, useLoadingFailsafe } from "@/lib/ui/loading-failsafe";
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";
import { lazyLogBoot } from "@/lib/observability/boot-investigation-lazy";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import { usePermissions, useUserPermissionsQuery } from "@/src/hooks/use-permissions";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

function GestionaleSectionLoading() {
  return (
    <div className={dsStackPage} aria-busy="true" role="status" aria-label="Caricamento sezione">
      <LoadingPageSkeleton variant="compact" />
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
  const permsQuery = useUserPermissionsQuery();
  const loadingFailsafe = useLoadingFailsafe(perm.isLoading, SECTION_LOADING_FAILSAFE_MS);

  useBootInvestigationMount("GestionaleSectionGate", { module });

  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    lazyLogBoot("RENDER", "GestionaleSectionGate", {
      module,
      isLoading: perm.isLoading,
      loadingFailsafe,
      canRead: perm.canRead,
    });
  }, [module, perm.isLoading, perm.canRead, loadingFailsafe]);

  if (perm.isLoading && !loadingFailsafe) return <GestionaleSectionLoading />;

  if (perm.isLoading && loadingFailsafe) {
    return (
      <div className={dsStackPage}>
        <LoadingErrorState
          title="Verifica permessi in corso troppo a lungo"
          description="Impossibile completare il controllo permessi. Riprova o contatta un amministratore se il problema persiste."
          onRetry={() => void permsQuery.refetch()}
        />
      </div>
    );
  }

  if (!perm.canRead) return <GestionaleAccessLimited module={module} />;

  return <>{children}</>;
}
