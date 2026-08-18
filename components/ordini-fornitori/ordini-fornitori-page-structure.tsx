import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { ListPageRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export function OrdiniFornitoriPageStructure({
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
    return (
      <ListPageRouteSkeleton
        scope={scope}
        sectionLabel="Azioni e filtri ordini fornitori"
        listSurface={listSurface}
      />
    );
  }
  return <>{children}</>;
}
