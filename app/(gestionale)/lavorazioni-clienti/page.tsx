import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ClientLavorazioniView } from "@/components/lavorazioni-clienti/client-lavorazioni-view";

export default function LavorazioniClientiPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="clienti" />}>
      <ClientLavorazioniView />
    </Suspense>
  );
}
