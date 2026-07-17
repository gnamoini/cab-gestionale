"use client";

import { useEffect } from "react";
import { GestionaleErrorFallbackLazy } from "@/components/public-surfaces/public-surface-loaders";
import { gestionaleLogger } from "@/lib/observability/logger";

export default function GestionaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    gestionaleLogger.error("next.error_boundary", {
      operation: "system",
      meta: { message: error.message, digest: error.digest, scope: "gestionale" },
    });
  }, [error]);

  return (
    <GestionaleErrorFallbackLazy
      variant="gestionale"
      message={error.message}
      digest={error.digest}
      onRetry={() => reset()}
    />
  );
}
