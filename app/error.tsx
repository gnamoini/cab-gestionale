"use client";

import { useEffect } from "react";
import { GestionaleErrorFallbackLazy } from "@/components/public-surfaces/public-surface-loaders";
import { gestionaleLogger } from "@/lib/observability/logger";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    gestionaleLogger.error("next.error_boundary", {
      operation: "system",
      meta: { message: error.message, digest: error.digest },
    });
  }, [error]);

  return (
    <GestionaleErrorFallbackLazy
      variant="root"
      message={error.message}
      digest={error.digest}
      onRetry={() => reset()}
    />
  );
}
