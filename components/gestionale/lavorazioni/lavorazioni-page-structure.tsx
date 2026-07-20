import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { LavorazioniRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";
import { ErpTableSection } from "@/components/design-system/layout/combined-list-section";

export function LavorazioniPageStructure({
  mode = "skeleton",
  scope = "full",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
}) {
  if (mode !== "skeleton") return null;
  return <LavorazioniRouteSkeleton scope={scope} />;
}

export const LavorazioniRouteStructure = LavorazioniPageStructure;

export function LavorazioniListBodySection({
  mode = "content",
  children,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
}) {
  if (mode === "skeleton") {
    return <LavorazioniRouteSkeleton scope="content" />;
  }
  return <>{children}</>;
}

export { ErpTableSection as LavorazioniTableSection } from "@/components/design-system/layout/combined-list-section";
