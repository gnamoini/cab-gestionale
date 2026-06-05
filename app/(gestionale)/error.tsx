"use client";

import { useEffect } from "react";
import { GestionaleErrorFallback } from "@/components/observability/gestionale-error-fallback";
import { gestionaleLogger } from "@/lib/observability/logger";

export default function GestionaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    gestionaleLogger.error("next.error_boundary", {
      operation: "system",
      meta: { message: error.message, digest: error.digest, scope: "gestionale" },
    });
  }, [error]);

  return (
    <GestionaleErrorFallback
      variant="gestionale"
      message={error.message}
      digest={error.digest}
      onRetry={() => reset()}
    />
  );
}
