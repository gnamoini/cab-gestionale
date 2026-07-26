import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { DipendentiRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export function DipendentiPageStructure({
  mode = "skeleton",
  scope = "full",
  listSurface = "table",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
  listSurface?: ListSurface;
}) {
  if (mode !== "skeleton") return null;
  return <DipendentiRouteSkeleton scope={scope} listSurface={listSurface} />;
}

export function DipendentiTimesheetSection({
  mode = "content",
  children,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
}) {
  if (mode === "skeleton") {
    return <DipendentiRouteSkeleton scope="content" />;
  }
  return <>{children}</>;
}
