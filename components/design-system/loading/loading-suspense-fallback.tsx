"use client";

import { memo } from "react";
import { LoadingPageShellSkeleton } from "./loading-page-shell-skeleton";
import type { LoadingPageSkeletonVariant } from "./loading-page-skeleton";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingSuspenseFallbackProps = {
  variant?: LoadingPageSkeletonVariant;
  className?: string;
};

const VARIANT_HEIGHT: Partial<Record<LoadingPageSkeletonVariant, string>> = {
  dashboard: "min-h-[36rem]",
  report: "min-h-[40rem]",
  dipendenti: "min-h-[32rem]",
  magazzino: SKELETON_MIN_HEIGHT.tableDesktop,
  mezzi: SKELETON_MIN_HEIGHT.tableCompact,
  documenti: SKELETON_MIN_HEIGHT.tableDocumenti,
  preventivi: SKELETON_MIN_HEIGHT.tableDesktop,
  lavorazioni: SKELETON_MIN_HEIGHT.tableDesktop,
  clienti: SKELETON_MIN_HEIGHT.tableDesktop,
  impostazioni: SKELETON_MIN_HEIGHT.settingsContent,
  default: SKELETON_MIN_HEIGHT.tableDesktop,
  compact: "min-h-[8rem]",
  kanban: "min-h-[24rem]",
  login: SKELETON_MIN_HEIGHT.loginCard,
  "client-detail": "min-h-[20rem]",
};

/**
 * Fallback Suspense minimale — evita skeleton dettagliato duplicato con la view.
 */
export const LoadingSuspenseFallback = memo(function LoadingSuspenseFallback({
  variant = "default",
  className = "",
}: LoadingSuspenseFallbackProps) {
  const contentMinHeightClass = VARIANT_HEIGHT[variant] ?? SKELETON_MIN_HEIGHT.tableDesktop;
  return (
    <div
      className={`min-w-0 p-2 sm:p-3 md:p-4 ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento pagina"
    >
      <LoadingPageShellSkeleton contentMinHeightClass={contentMinHeightClass} />
    </div>
  );
});
