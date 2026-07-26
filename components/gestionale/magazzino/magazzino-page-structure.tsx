import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { ListPageRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";
import { ErpTableSection } from "@/components/design-system/layout/combined-list-section";

/** SSOT struttura pagina — route loading + view (toolbar + tabella in ShellCard). */
export function MagazzinoPageStructure({
  mode = "content",
  scope = "full",
  listSurface = "table",
  children,
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
  listSurface?: ListSurface;
  children?: ReactNode;
}) {
  if (mode === "skeleton") {
    return <ListPageRouteSkeleton scope={scope} sectionLabel="Azioni e filtri magazzino" listSurface={listSurface} />;
  }
  return <>{children}</>;
}

/** @deprecated Usare MagazzinoPageStructure */
export const MagazzinoRouteStructure = ({ mode = "skeleton", scope = "full" }: { mode?: SkeletonMode; scope?: RouteSkeletonScope }) => (
  <MagazzinoPageStructure mode={mode} scope={scope} />
);

/** Primo fetch dati — solo area tabella (toolbar già montata). */
export const MagazzinoTableSection = ErpTableSection;
