import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { DipendentiRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export function DipendentiPageStructure({
  mode = "skeleton",
  scope = "full",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
}) {
  if (mode !== "skeleton") return null;
  return <DipendentiRouteSkeleton scope={scope} />;
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
