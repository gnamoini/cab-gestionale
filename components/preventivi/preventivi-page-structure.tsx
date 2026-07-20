import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { ListPageRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";
import { ErpTableSection } from "@/components/design-system/layout/combined-list-section";

export function PreventiviPageStructure({
  mode = "content",
  scope = "full",
  children,
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
  children?: ReactNode;
}) {
  if (mode === "skeleton") {
    return <ListPageRouteSkeleton scope={scope} sectionLabel="Azioni e filtri preventivi" />;
  }
  return <>{children}</>;
}

export const PreventiviRouteStructure = ({ mode = "skeleton", scope = "full" }: { mode?: SkeletonMode; scope?: RouteSkeletonScope }) => (
  <PreventiviPageStructure mode={mode} scope={scope} />
);

export const PreventiviTableSection = ErpTableSection;
