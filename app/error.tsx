"use client";

import { useEffect } from "react";
import { GestionaleErrorFallback } from "@/components/observability/gestionale-error-fallback";
import { gestionaleLogger } from "@/lib/observability/logger";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    gestionaleLogger.error("next.error_boundary", {
      operation: "system",
      meta: { message: error.message, digest: error.digest },
    });
  }, [error]);

  return <GestionaleErrorFallback variant="root" message={error.message} onRetry={() => reset()} />;
}
