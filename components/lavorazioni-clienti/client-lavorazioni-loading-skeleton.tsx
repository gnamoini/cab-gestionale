"use client";

import { memo } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { PORTALE_CLIENTI_LABEL } from "@/lib/lavorazioni/client-portal-access";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { SkeletonBlock } from "@/components/design-system/loading/skeleton-primitives";
import { SkeletonShellCard } from "@/components/design-system/loading/skeleton-shell-card";
import { SKELETON_MIN_HEIGHT } from "@/components/design-system/loading/skeleton-layout-presets";

/** Stack pagina portale clienti — stesso token della view caricata. */
export const clientPortalPageStack =
  "cab-layout-page-stack min-w-0 max-w-full space-y-[length:var(--ds-space-lg)]";

/** Toolbar filtri misurata su /lavorazioni-clienti (117px). */
const CLIENT_PORTAL_SKELETON_FILTER_BODY_MIN = "min-h-[7.3125rem]";
/** Body card lista desktop misurato (915px); mobile card stack più basso. */
const CLIENT_PORTAL_SKELETON_LIST_BODY_MIN = "min-h-[24rem] md:min-h-[57.1875rem]";

/**
 * Tre ShellCard come contenuto reale — solo corpi pulse, nessun dettaglio simulato.
 */
export const ClientLavorazioniStackSkeleton = memo(function ClientLavorazioniStackSkeleton() {
  return (
    <>
      <SkeletonShellCard sectionLabel="Azioni e filtri lavorazioni clienti" bodyMinHeightClass={CLIENT_PORTAL_SKELETON_FILTER_BODY_MIN} />

      <SkeletonShellCard
        title="Lavorazioni in corso"
        collapsible
        defaultCollapsed={false}
        bodyMinHeightClass={CLIENT_PORTAL_SKELETON_LIST_BODY_MIN}
      />

      <SkeletonShellCard title="Lavorazioni completate" collapsible defaultCollapsed bodyMinHeightClass="min-h-0" />
    </>
  );
});

/** @deprecated Alias — preferire ClientLavorazioniStackSkeleton o ClientLavorazioniPageSkeleton. */
export const ClientLavorazioniLoadingSkeleton = ClientLavorazioniStackSkeleton;

/**
 * Shell pagina intera — fallback Suspense/dynamic e primo paint coerente con la view.
 */
export const ClientLavorazioniPageSkeleton = memo(function ClientLavorazioniPageSkeleton() {
  return (
    <div
      className={`lavorazioni-scroll-scope ${layoutPageRoot}`}
      role="status"
      aria-busy="true"
      aria-label="Caricamento lavorazioni"
    >
      <div className="[&_header]:mb-2 sm:[&_header]:mb-3">
        <PageHeader
          title={PORTALE_CLIENTI_LABEL}
          actions={
            <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
              <SkeletonBlock className={`${SKELETON_MIN_HEIGHT.pageHeader} !h-11 !w-11 sm:!h-11 sm:!min-h-11 sm:!w-[5.5rem]`} />
            </div>
          }
        />
      </div>

      <div className={clientPortalPageStack}>
        <ClientLavorazioniStackSkeleton />
      </div>
    </div>
  );
});
