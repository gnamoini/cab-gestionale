
import { memo } from "react";
import { SkeletonCard } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingLavorazioneMobileCardSkeletonProps = {
  /** @deprecated Ignorato. */
  showNote?: boolean;
  /** @deprecated Ignorato. */
  showStatusPill?: boolean;
  /** @deprecated Ignorato. */
  showControls?: boolean;
  /** @deprecated Ignorato. */
  actionCount?: number;
  className?: string;
};

/** @deprecated Preferire `SkeletonCard` mobile. */
export const LoadingLavorazioneMobileCardSkeleton = memo(function LoadingLavorazioneMobileCardSkeleton({
  className = "",
}: LoadingLavorazioneMobileCardSkeletonProps) {
  return <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.cardMobile} className={className} />;
});
