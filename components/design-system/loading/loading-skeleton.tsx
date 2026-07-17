
import { memo, type CSSProperties } from "react";
import { dsSkeletonBlock, dsSkeletonLine } from "@/lib/ui/design-system";
import { loadingSkeletonPulseClass } from "./loading-tokens";

export type LoadingSkeletonLineProps = {
  className?: string;
  style?: CSSProperties;
};

export const LoadingSkeletonLine = memo(function LoadingSkeletonLine({
  className = "",
  style,
}: LoadingSkeletonLineProps) {
  return <div className={`${dsSkeletonLine} ${className}`.trim()} style={style} aria-hidden />;
});

export type LoadingSkeletonBlockProps = {
  className?: string;
  style?: CSSProperties;
};

export const LoadingSkeletonBlock = memo(function LoadingSkeletonBlock({
  className = "",
  style,
}: LoadingSkeletonBlockProps) {
  return <div className={`${dsSkeletonBlock} ${className}`.trim()} style={style} aria-hidden />;
});

export type LoadingSkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

/** Skeleton generico (pill/bar). */
export const LoadingSkeleton = memo(function LoadingSkeleton({
  className = "",
  style,
}: LoadingSkeletonProps) {
  return (
    <div className={`${loadingSkeletonPulseClass} ${className}`.trim()} style={style} aria-hidden />
  );
});
