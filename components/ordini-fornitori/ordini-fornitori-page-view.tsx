"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import { useSearchParams } from "next/navigation";
import { OrdiniFornitoriView } from "@/components/ordini-fornitori/ordini-fornitori-view";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { gestionaleListTierClass } from "@/lib/ui/gestionale-list-responsive";
import type { GestionaleListPageProps } from "@/lib/ui/gestionale-list-page-props";
import { useListSurface } from "@/lib/ui/use-list-surface";

export function OrdiniFornitoriPageView({ listSurface: serverListSurface, listTier = "xl" }: GestionaleListPageProps) {
  useGestionaleSyncScope({
    scopeId: "ordini-fornitori-page-view",
    domain: "ordini_fornitori",
    route: "/ordini-fornitori",
    tables: ["ordini_fornitori", "ordini_fornitori_righe"],
  });
  const listSurface = useListSurface(serverListSurface);
  const { modules: permModules } = usePermissionsSnapshot();
  const ordiniPerm = permModules.ordini_fornitori;
  const searchParams = useSearchParams();
  const initialOrdineId = searchParams.get("ordine")?.trim() || undefined;

  return (
    <GestionaleSectionGate module="ordini_fornitori">
      <div className={`lavorazioni-scroll-scope ${layoutPageRoot} ${gestionaleListTierClass(listTier)}`.trim()}>
        <OrdiniFornitoriView
          listSurface={listSurface}
          canRead={ordiniPerm.canRead}
          canWrite={ordiniPerm.canWrite}
          initialOrdineId={initialOrdineId}
        />
      </div>
    </GestionaleSectionGate>
  );
}
