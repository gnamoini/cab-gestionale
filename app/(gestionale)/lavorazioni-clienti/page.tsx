import { Suspense } from "react";
import { ClientLavorazioniView } from "@/components/lavorazioni-clienti/client-lavorazioni-view";

export default function LavorazioniClientiPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Caricamento…</div>}>
      <ClientLavorazioniView />
    </Suspense>
  );
}
