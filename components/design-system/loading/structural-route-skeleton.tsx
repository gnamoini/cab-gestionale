import { memo } from "react";
import { LoginPageStructure } from "@/components/auth/login-page-structure";
import type { MigratedStructuralRoute } from "@/lib/ui/migrated-structural-routes";
import { STRUCTURAL_ROUTE_SKELETON_CONTRACTS } from "@/lib/ui/structural-route-skeleton-contracts";
import { StructuralSkeletonRenderer } from "./structural-skeleton-renderer";

export type StructuralRouteSkeletonProps = {
  route: MigratedStructuralRoute;
  ariaLabel?: string;
  className?: string;
};

/** Skeleton body route — senza PageHeader (per Suspense sub-route). */
export const StructuralRouteSkeleton = memo(function StructuralRouteSkeleton({
  route,
  ariaLabel,
  className = "",
}: StructuralRouteSkeletonProps) {
  if (route === "login") {
    return <LoginPageStructure mode="skeleton" className={className} />;
  }
  const contract = STRUCTURAL_ROUTE_SKELETON_CONTRACTS[route];
  return (
    <StructuralSkeletonRenderer
      contract={contract}
      ariaLabel={ariaLabel ?? `Caricamento ${route}`}
      className={className}
    />
  );
});
