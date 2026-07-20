import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { ClientDetailRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export function ClientDetailPageStructure({
  mode = "skeleton",
  scope = "full",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
}) {
  if (mode !== "skeleton") return null;
  return <ClientDetailRouteSkeleton scope={scope} />;
}

export function ClientDetailBodySection({
  mode = "content",
  children,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
}) {
  if (mode === "skeleton") {
    return <ClientDetailRouteSkeleton scope="content" />;
  }
  return <>{children}</>;
}
