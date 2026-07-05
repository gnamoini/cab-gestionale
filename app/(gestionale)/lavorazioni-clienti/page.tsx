import { Suspense } from "react";
import { ClientLavorazioniPageSkeleton } from "@/components/lavorazioni-clienti/client-lavorazioni-loading-skeleton";
import { ClientLavorazioniViewLazy } from "@/components/gestionale/lazy-route-views";

export default function LavorazioniClientiPage() {
  return (
    <Suspense fallback={<ClientLavorazioniPageSkeleton />}>
      <ClientLavorazioniViewLazy />
    </Suspense>
  );
}
