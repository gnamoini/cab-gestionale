import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { ClientiRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

/** Stack pagina portale clienti — stesso spacing della view caricata. */
export const clientPortalPageStack =
  "cab-layout-page-stack min-w-0 max-w-full space-y-[length:var(--ds-space-lg)]";

export function ClientiPageStructure({
  mode = "skeleton",
  scope = "full",
  listSurface = "table",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
  listSurface?: ListSurface;
}) {
  if (mode !== "skeleton") return null;
  return <ClientiRouteSkeleton scope={scope} listSurface={listSurface} />;
}

export function ClientiStackSection({
  mode = "content",
  children,
  className,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
  className?: string;
}) {
  if (mode === "skeleton") {
    return <ClientiRouteSkeleton scope="content" />;
  }
  return <div className={className ?? clientPortalPageStack}>{children}</div>;
}
