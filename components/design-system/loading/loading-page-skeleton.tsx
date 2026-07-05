"use client";

import { memo } from "react";
import { LoadingAgendaSkeleton } from "./loading-agenda-skeleton";
import { LoadingClientDetailSkeleton } from "./loading-client-detail-skeleton";
import { LoadingDashboardSkeleton } from "./loading-dashboard-skeleton";
import { LoadingFatturazioneSkeleton } from "./loading-fatturazione-skeleton";
import { LoadingProductionReadinessSkeleton } from "./loading-production-readiness-skeleton";
import { LoadingSicurezzaSkeleton } from "./loading-sicurezza-skeleton";
import { LoadingDipendentiSkeleton } from "./loading-dipendenti-skeleton";
import { LoadingDocumentiListSkeleton } from "./loading-documenti-list-skeleton";
import { LoadingImpostazioniSkeleton } from "./loading-impostazioni-skeleton";
import { LoadingKanbanSkeleton } from "./loading-kanban-skeleton";
import { LoadingLavorazioniListSkeleton } from "./loading-lavorazioni-list-skeleton";
import { LoadingLoginSkeleton } from "./loading-login-skeleton";
import { LoadingMagazzinoListSkeleton } from "./loading-magazzino-list-skeleton";
import { LoadingMezziListSkeleton } from "./loading-mezzi-list-skeleton";
import { LoadingPageShellSkeleton } from "./loading-page-shell-skeleton";
import { LoadingPreventiviListSkeleton } from "./loading-preventivi-list-skeleton";
import { LoadingReportSkeleton } from "./loading-report-skeleton";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingPageSkeletonVariant =
  | "default"
  | "lavorazioni"
  | "magazzino"
  | "mezzi"
  | "documenti"
  | "preventivi"
  | "clienti"
  | "dashboard"
  | "dipendenti"
  | "report"
  | "kanban"
  | "impostazioni"
  | "login"
  | "client-detail"
  | "compact"
  | "agenda"
  | "fatturazione"
  | "sicurezza"
  | "production-readiness";

export type LoadingPageSkeletonProps = {
  variant?: LoadingPageSkeletonVariant;
  className?: string;
};

const SHELL_CONTENT_HEIGHT: Partial<Record<LoadingPageSkeletonVariant, string>> = {
  default: SKELETON_MIN_HEIGHT.tableDesktop,
  compact: "min-h-[8rem]",
  kanban: "min-h-[24rem]",
};

/** Skeleton pagina — composizioni ShellCard + pulse allineate al layout reale. */
export const LoadingPageSkeleton = memo(function LoadingPageSkeleton({
  variant = "default",
  className = "",
}: LoadingPageSkeletonProps) {
  if (variant === "agenda") {
    return <LoadingAgendaSkeleton className={className} />;
  }
  if (variant === "dashboard") {
    return <LoadingDashboardSkeleton className={className} />;
  }
  if (variant === "fatturazione") {
    return <LoadingFatturazioneSkeleton className={className} />;
  }
  if (variant === "sicurezza") {
    return <LoadingSicurezzaSkeleton className={className} />;
  }
  if (variant === "production-readiness") {
    return <LoadingProductionReadinessSkeleton className={className} />;
  }
  if (variant === "dipendenti") {
    return <LoadingDipendentiSkeleton className={className} />;
  }
  if (variant === "report") {
    return <LoadingReportSkeleton className={className} />;
  }
  if (variant === "kanban") {
    return <LoadingKanbanSkeleton className={className} />;
  }
  if (variant === "impostazioni") {
    return <LoadingImpostazioniSkeleton className={className} />;
  }
  if (variant === "login") {
    return <LoadingLoginSkeleton className={className} />;
  }
  if (variant === "client-detail") {
    return (
      <div className={className}>
        <LoadingClientDetailSkeleton />
      </div>
    );
  }
  if (variant === "lavorazioni") {
    return <LoadingLavorazioniListSkeleton className={className} />;
  }
  if (variant === "magazzino") {
    return <LoadingMagazzinoListSkeleton className={className} />;
  }
  if (variant === "mezzi") {
    return <LoadingMezziListSkeleton className={className} />;
  }
  if (variant === "documenti") {
    return <LoadingDocumentiListSkeleton className={className} />;
  }
  if (variant === "preventivi") {
    return <LoadingPreventiviListSkeleton className={className} />;
  }

  return (
    <LoadingPageShellSkeleton
      className={className}
      contentMinHeightClass={SHELL_CONTENT_HEIGHT[variant] ?? SKELETON_MIN_HEIGHT.tableDesktop}
    />
  );
});
