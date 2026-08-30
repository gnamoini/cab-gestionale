"use client";

import { useEffect, useRef } from "react";

/** Defer PDF warmup module — keeps pdf artifact registry off critical route chunks. */
export function useReportPdfWarmup(): void {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void import("@/lib/observability/asset-cache-warmup").then((m) => m.warmupPdfArtifact("report-bundle"));
  }, []);
}

export function useLavorazioniPdfWarmup(): void {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void import("@/lib/observability/asset-cache-warmup").then((m) => m.warmupPdfArtifact("lavorazioni-in-corso"));
  }, []);
}
