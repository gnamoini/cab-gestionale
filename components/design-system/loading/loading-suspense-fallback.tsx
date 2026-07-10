"use client";

import { memo } from "react";
import { ClientLavorazioniPageSkeleton } from "@/components/lavorazioni-clienti/client-lavorazioni-loading-skeleton";
import { LoadingPageSkeleton, type LoadingPageSkeletonVariant } from "./loading-page-skeleton";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

/** Min-height per variant — smoke coverage + riduzione layout shift Suspense. */
const SUSPENSE_VARIANT_MIN_HEIGHT: Record<LoadingPageSkeletonVariant, string> = {
  default: SKELETON_MIN_HEIGHT.tableDesktop,
  dashboard: SKELETON_MIN_HEIGHT.kpiRow,
  agenda: SKELETON_MIN_HEIGHT.agendaMain,
  lavorazioni: SKELETON_MIN_HEIGHT.tableDesktop,
  magazzino: SKELETON_MIN_HEIGHT.tableDesktop,
  mezzi: SKELETON_MIN_HEIGHT.tableDesktop,
  documenti: SKELETON_MIN_HEIGHT.tableDocumenti,
  preventivi: SKELETON_MIN_HEIGHT.tableDesktop,
  fatturazione: SKELETON_MIN_HEIGHT.tableDesktop,
  dipendenti: SKELETON_MIN_HEIGHT.tableDesktop,
  report: SKELETON_MIN_HEIGHT.chart,
  impostazioni: SKELETON_MIN_HEIGHT.settingsContent,
  clienti: SKELETON_MIN_HEIGHT.tableDesktop,
  "client-detail": SKELETON_MIN_HEIGHT.tableCompact,
  sicurezza: SKELETON_MIN_HEIGHT.sicurezzaPanel,
  "production-readiness": SKELETON_MIN_HEIGHT.productionReadinessCard,
  login: SKELETON_MIN_HEIGHT.loginCard,
  compact: SKELETON_MIN_HEIGHT.tableCompact,
  kanban: "min-h-[24rem]",
};

export type LoadingSuspenseFallbackProps = {
  variant?: LoadingPageSkeletonVariant;
  className?: string;
};

/**
 * Fallback Suspense — delega allo skeleton pagina coerente con il layout reale.
 */
export const LoadingSuspenseFallback = memo(function LoadingSuspenseFallback({
  variant = "default",
  className = "",
}: LoadingSuspenseFallbackProps) {
  const minHeight = SUSPENSE_VARIANT_MIN_HEIGHT[variant];
  const mergedClass = [minHeight, className].filter(Boolean).join(" ");
  if (variant === "clienti") {
    return <ClientLavorazioniPageSkeleton />;
  }
  return <LoadingPageSkeleton variant={variant} className={mergedClass} />;
});
