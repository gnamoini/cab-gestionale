import { Suspense } from "react";
import { PageTransitionLoader } from "@/components/design-system";
import { ClientLavorazioneDetailViewLazy } from "@/components/gestionale/lazy-route-views";
import { ClientPortalDetailDeferredHydration } from "@/components/lavorazioni-clienti/client-portal-detail-deferred-hydration";

export default async function LavorazioneClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageTransitionLoader variant="client-detail" />}>
      <ClientPortalDetailDeferredHydration lavorazioneId={id}>
        <ClientLavorazioneDetailViewLazy lavorazioneId={id} />
      </ClientPortalDetailDeferredHydration>
    </Suspense>
  );
}
