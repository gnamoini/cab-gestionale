import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { FatturazioneRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export function FatturazionePageStructure({
  mode = "skeleton",
  scope = "full",
  listSurface = "table",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
  listSurface?: import("@/lib/ui/resolve-list-surface").ListSurface;
}) {
  if (mode !== "skeleton") return null;
  return <FatturazioneRouteSkeleton scope={scope} listSurface={listSurface} />;
}

export function FatturazioneTabSection({
  mode = "content",
  children,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
}) {
  if (mode === "skeleton") {
    return <FatturazioneRouteSkeleton scope="content" />;
  }
  return <>{children}</>;
}
