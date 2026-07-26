import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { SicurezzaRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export function SicurezzaPageStructure({
  mode = "skeleton",
  scope = "full",
  listSurface = "table",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
  listSurface?: ListSurface;
}) {
  if (mode !== "skeleton") return null;
  return <SicurezzaRouteSkeleton scope={scope} listSurface={listSurface} />;
}
