"use client";

import { memo } from "react";
import { LoadingLavorazioniListSkeleton } from "@/components/design-system/loading";

export const ClientLavorazioniLoadingSkeleton = memo(function ClientLavorazioniLoadingSkeleton() {
  return (
    <div aria-busy="true" role="status" aria-label="Caricamento lavorazioni">
      <LoadingLavorazioniListSkeleton />
    </div>
  );
});
