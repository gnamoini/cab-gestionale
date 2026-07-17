
import { memo } from "react";
import { SkeletonForm } from "./skeleton-primitives";

export type LoadingFormSkeletonProps = {
  sections?: number;
  /** @deprecated Usare `sections` (1 blocco ≈ 1 sezione). */
  fields?: number;
  className?: string;
};

export const LoadingFormSkeleton = memo(function LoadingFormSkeleton({
  sections: sectionsProp,
  fields,
  className = "",
}: LoadingFormSkeletonProps) {
  const sections = sectionsProp ?? (fields != null ? Math.min(3, Math.max(1, Math.ceil(fields / 2))) : 2);
  return <SkeletonForm sections={sections} className={className} />;
});
