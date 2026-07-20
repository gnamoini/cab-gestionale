import type { ReactNode } from "react";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { ClientiRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

/** Stack pagina portale clienti — stesso spacing della view caricata. */
export const clientPortalPageStack =
  "cab-layout-page-stack min-w-0 max-w-full space-y-[length:var(--ds-space-lg)]";

export function ClientiPageStructure({
  mode = "skeleton",
  scope = "full",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
}) {
  if (mode !== "skeleton") return null;
  return <ClientiRouteSkeleton scope={scope} />;
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
