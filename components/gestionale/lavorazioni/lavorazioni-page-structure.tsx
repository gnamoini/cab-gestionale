import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { LavorazioniRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";
import { ErpTableSection } from "@/components/design-system/layout/combined-list-section";

export function LavorazioniPageStructure({
  mode = "skeleton",
  scope = "full",
  listSurface = "table",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
  listSurface?: ListSurface;
}) {
  if (mode !== "skeleton") return null;
  return <LavorazioniRouteSkeleton scope={scope} listSurface={listSurface} />;
}

export const LavorazioniRouteStructure = LavorazioniPageStructure;

export function LavorazioniListBodySection({
  mode = "content",
  listSurface = "table",
  children,
}: {
  mode?: SkeletonMode;
  listSurface?: ListSurface;
  children?: ReactNode;
}) {
  if (mode === "skeleton") {
    return <LavorazioniRouteSkeleton scope="content" listSurface={listSurface} />;
  }
  return <>{children}</>;
}

export { ErpTableSection as LavorazioniTableSection } from "@/components/design-system/layout/combined-list-section";
