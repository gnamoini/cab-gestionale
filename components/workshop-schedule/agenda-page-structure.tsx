import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { AgendaRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export function AgendaPageStructure({
  mode = "skeleton",
  scope = "full",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
}) {
  if (mode !== "skeleton") return null;
  return <AgendaRouteSkeleton scope={scope} />;
}

export function AgendaContentSection({ mode = "content" }: { mode?: SkeletonMode }) {
  if (mode !== "skeleton") return null;
  return <AgendaRouteSkeleton scope="content" />;
}
