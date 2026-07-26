import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { ListPageRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";
import { ErpTableSection } from "@/components/design-system/layout/combined-list-section";

export function MezziPageStructure({
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
    return <ListPageRouteSkeleton scope={scope} sectionLabel="Azioni e filtri mezzi" listSurface={listSurface} />;
  }
  return <>{children}</>;
}

export const MezziRouteStructure = ({ mode = "skeleton", scope = "full" }: { mode?: SkeletonMode; scope?: RouteSkeletonScope }) => (
  <MezziPageStructure mode={mode} scope={scope} />
);

export const MezziTableSection = ErpTableSection;
