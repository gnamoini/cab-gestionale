import { StructuralSkeletonRenderer } from "@/components/design-system/loading/structural-skeleton-renderer";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { STRUCTURAL_ROUTE_SKELETON_CONTRACTS } from "@/lib/ui/structural-route-skeleton-contracts";

/** Auth standalone — senza PageLayout gestionale. */
export function LoginPageStructure({ mode = "skeleton", className = "" }: { mode?: SkeletonMode; className?: string }) {
  if (mode === "content") return null;
  return (
    <div
      className={`flex min-h-dvh min-w-0 max-w-full items-center justify-center px-4 ${className}`.trim()}
    >
      <StructuralSkeletonRenderer
        contract={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.login}
        ariaLabel="Caricamento login"
        className="w-full max-w-md"
      />
    </div>
  );
}
