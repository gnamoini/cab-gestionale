"use client";

import { memo } from "react";
import { SkeletonCard } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingCardSkeletonProps = {
  /** Altezza minima card (default dashboard widget). */
  minHeightClass?: string;
  /** @deprecated Ignorato — skeleton è un solo contenitore. */
  rows?: number;
  className?: string;
};

/** @deprecated Preferire `SkeletonCard`. Wrapper compatibilità. */
export const LoadingCardSkeleton = memo(function LoadingCardSkeleton({
  minHeightClass = SKELETON_MIN_HEIGHT.cardWidget,
  className = "",
}: LoadingCardSkeletonProps) {
  return <SkeletonCard minHeightClass={minHeightClass} className={className} />;
});
