import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ClientLavorazioniViewLazy } from "@/components/gestionale/lazy-route-views";

export default function LavorazioniClientiPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="clienti" />}>
      <ClientLavorazioniViewLazy />
    </Suspense>
  );
}
