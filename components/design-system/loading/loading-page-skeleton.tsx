
import { memo } from "react";
import type { MigratedStructuralRoute } from "@/lib/ui/migrated-structural-routes";
import { MIGRATED_STRUCTURAL_ROUTES } from "@/lib/ui/migrated-structural-routes";
import { LoadingKanbanSkeleton } from "./loading-kanban-skeleton";
import { LoadingPageShellSkeleton } from "./loading-page-shell-skeleton";
import { StructuralRouteSkeleton } from "./structural-route-skeleton";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingPageSkeletonVariant =
  | "default"
  | "lavorazioni"
  | "magazzino"
  | "mezzi"
  | "documenti"
  | "preventivi"
  | "clienti"
  | "dashboard"
  | "dipendenti"
  | "report"
  | "kanban"
  | "impostazioni"
  | "login"
  | "client-detail"
  | "compact"
  | "agenda"
  | "fatturazione"
  | "sicurezza"
  | "production-readiness";

export type LoadingPageSkeletonProps = {
  variant?: LoadingPageSkeletonVariant;
  className?: string;
};

const SHELL_CONTENT_HEIGHT: Partial<Record<LoadingPageSkeletonVariant, string>> = {
  default: SKELETON_MIN_HEIGHT.tableDesktop,
  compact: "min-h-[8rem]",
  kanban: "min-h-[24rem]",
};

function isStructuralRoute(variant: LoadingPageSkeletonVariant): variant is MigratedStructuralRoute {
  return (MIGRATED_STRUCTURAL_ROUTES as readonly string[]).includes(variant);
}

/** Skeleton pagina — route strutturali: StructuralRouteSkeleton; fallback shell per route generiche. */
export const LoadingPageSkeleton = memo(function LoadingPageSkeleton({
  variant = "default",
  className = "",
}: LoadingPageSkeletonProps) {
  if (isStructuralRoute(variant)) {
    return <StructuralRouteSkeleton route={variant} className={className} />;
  }
  if (variant === "kanban") {
    return <LoadingKanbanSkeleton className={className} />;
  }

  return (
    <LoadingPageShellSkeleton
      className={className}
      contentMinHeightClass={SHELL_CONTENT_HEIGHT[variant] ?? SKELETON_MIN_HEIGHT.tableDesktop}
    />
  );
});
