"use client";

import { Children, cloneElement, isValidElement, memo, type ReactElement, type ReactNode } from "react";
import type { SkeletonMode } from "./skeleton-contract";
import { ContentReveal } from "./content-reveal";

export type SkeletonBoundaryChildProps = {
  mode?: SkeletonMode;
};

export type SkeletonBoundaryProps = {
  loading: boolean;
  children: ReactElement<SkeletonBoundaryChildProps>;
  /** Fallback se children non accetta mode (non usare in route migrate). */
  skeletonFallback?: ReactNode;
};

/**
 * Gate loading inline — solo primo fetch view.
 * Non gestisce overlay, toast, auth o router.
 */
export const SkeletonBoundary = memo(function SkeletonBoundary({
  loading,
  children,
  skeletonFallback = null,
}: SkeletonBoundaryProps) {
  if (!loading) {
    return <ContentReveal data-testid="content-reveal">{children}</ContentReveal>;
  }

  if (isValidElement<SkeletonBoundaryChildProps>(children)) {
    return cloneElement(children, { mode: "skeleton" });
  }

  return skeletonFallback;
});

/** ponytail: assert — child deve accettare mode */
export function assertSkeletonBoundaryChild(child: ReactNode): void {
  const only = Children.only(child);
  if (!isValidElement<SkeletonBoundaryChildProps>(only)) {
    throw new Error("SkeletonBoundary: child deve essere un elemento React con prop mode");
  }
}
