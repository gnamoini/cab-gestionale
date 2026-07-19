import type { ReactNode } from "react";
import type { SkeletonContract, SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { resolveGeometryClasses } from "@/components/design-system/loading/skeleton-geometry-tokens";
import { StructuralSkeletonRenderer } from "@/components/design-system/loading/structural-skeleton-renderer";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

export type PageSectionProps = {
  children?: ReactNode;
  mode?: SkeletonMode;
  skeleton: SkeletonContract;
  className?: string;
  ariaLabel?: string;
};

/**
 * Sezione pagina con Skeleton Contract — API pubblica structural loading.
 * mode="skeleton": placeholder senza montare children.
 */
export function PageSection({
  children,
  mode = "content",
  skeleton,
  className = "",
  ariaLabel,
}: PageSectionProps) {
  if (mode === "skeleton") {
    return (
      <StructuralSkeletonRenderer
        contract={skeleton}
        ariaLabel={ariaLabel ?? "Caricamento sezione"}
        className={className}
      />
    );
  }

  const geometryClass =
    skeleton.kind === "stack" ? "" : resolveGeometryClasses(skeleton.geometry);
  const structureClass = skeleton.kind === "stack" ? (skeleton.className ?? "") : "";
  const merged = [layoutPageRoot, geometryClass, structureClass, className].filter(Boolean).join(" ");

  return (
    <div className={merged} data-skeleton-kind={skeleton.kind}>
      {children}
    </div>
  );
}
