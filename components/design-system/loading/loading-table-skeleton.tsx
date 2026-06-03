"use client";

import { memo } from "react";
import { SkeletonTable } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingTablePreset =
  | "lavorazioni"
  | "magazzino"
  | "mezzi"
  | "documenti"
  | "clienti"
  | "generic";

const PRESET_HEIGHT: Record<LoadingTablePreset, string> = {
  lavorazioni: SKELETON_MIN_HEIGHT.tableDesktop,
  magazzino: SKELETON_MIN_HEIGHT.tableDesktop,
  mezzi: SKELETON_MIN_HEIGHT.tableCompact,
  documenti: SKELETON_MIN_HEIGHT.tableDocumenti,
  clienti: SKELETON_MIN_HEIGHT.tableDesktop,
  generic: SKELETON_MIN_HEIGHT.tableDesktop,
};

export type LoadingTableSkeletonProps = {
  preset?: LoadingTablePreset;
  /** @deprecated Ignorato. */
  rows?: number;
  /** @deprecated Ignorato. */
  stickyHead?: boolean;
  visibilityClass?: string;
  className?: string;
  wrapClassName?: string;
  /** @deprecated Ignorato. */
  hideHeaders?: boolean;
  /** @deprecated Ignorato. */
  actionButtonCount?: number;
};

/**
 * @deprecated Preferire `SkeletonTable`. Non simula più righe/colonne.
 */
export const LoadingTableSkeleton = memo(function LoadingTableSkeleton({
  preset = "generic",
  visibilityClass = "",
  className = "",
  wrapClassName = "",
}: LoadingTableSkeletonProps) {
  return (
    <SkeletonTable
      minHeightClass={PRESET_HEIGHT[preset]}
      visibilityClass={visibilityClass}
      className={className}
      wrapClassName={wrapClassName}
    />
  );
});
