"use client";

import { memo } from "react";
import { ClientLavorazioniPageSkeleton } from "@/components/lavorazioni-clienti/client-lavorazioni-loading-skeleton";
import { LoadingPageSkeleton, type LoadingPageSkeletonVariant } from "./loading-page-skeleton";

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
  if (variant === "clienti") {
    return <ClientLavorazioniPageSkeleton />;
  }
  return <LoadingPageSkeleton variant={variant} className={className} />;
});
