import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { LavorazioniView } from "@/components/gestionale/lavorazioni/lavorazioni-view";
import { UIPageAdapter } from "@/lib/ui-os";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";

export default function LavorazioniPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="lavorazioni" />}>
      <UIPageAdapter
        page="/lavorazioni"
        mode="os"
        fallback="legacy"
        schema={getSuggestedSchema("/lavorazioni")}
      >
        <LavorazioniView />
      </UIPageAdapter>
    </Suspense>
  );
}
