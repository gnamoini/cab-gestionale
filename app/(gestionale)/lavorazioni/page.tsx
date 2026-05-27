import { Suspense } from "react";
import { GlobalLoadingPageFallback } from "@/components/design-system";
import { LavorazioniView } from "@/components/gestionale/lavorazioni/lavorazioni-view";

export default function LavorazioniPage() {
  return (
    <Suspense fallback={<GlobalLoadingPageFallback />}>
      <LavorazioniView />
    </Suspense>
  );
}
