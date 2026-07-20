import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { DocumentiPageRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export function DocumentiPageStructure({
  mode = "skeleton",
  scope = "full",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
}) {
  if (mode !== "skeleton") return null;
  return <DocumentiPageRouteSkeleton scope={scope} />;
}

export const DocumentiRouteStructure = DocumentiPageStructure;

export { ErpTableSection as DocumentiTableSection } from "@/components/design-system/layout/combined-list-section";
