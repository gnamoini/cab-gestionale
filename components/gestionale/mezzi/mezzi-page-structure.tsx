import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { ListPageRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";
import { ErpTableSection } from "@/components/design-system/layout/combined-list-section";

export function MezziPageStructure({
  mode = "content",
  scope = "full",
  children,
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
  children?: ReactNode;
}) {
  if (mode === "skeleton") {
    return <ListPageRouteSkeleton scope={scope} sectionLabel="Azioni e filtri mezzi" />;
  }
  return <>{children}</>;
}

export const MezziRouteStructure = ({ mode = "skeleton", scope = "full" }: { mode?: SkeletonMode; scope?: RouteSkeletonScope }) => (
  <MezziPageStructure mode={mode} scope={scope} />
);

export const MezziTableSection = ErpTableSection;
