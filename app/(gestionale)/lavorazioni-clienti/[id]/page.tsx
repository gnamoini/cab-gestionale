import { dehydrate, QueryClient } from "@tanstack/react-query";
import { ClientLavorazioneDetailViewLazy } from "@/components/gestionale/lazy-route-views";
import { fetchClientPortalDetailDTOServer } from "@/lib/bff/client-portal-detail-fetch-server";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { QK } from "@/src/lib/react-query/query-keys";
import type { ClientLavorazioneDetail } from "@/src/services/client-lavorazioni.service";

export default async function LavorazioneClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qc = new QueryClient();
  const trimmedId = id.trim();
  const res = await fetchClientPortalDetailDTOServer(trimmedId);
  if (res.success && res.data) {
    qc.setQueryData<ClientLavorazioneDetail>([...QK.clientLavorazioniDetail, trimmedId] as const, res.data);
  }
  return (
    <GestionaleHydrationBoundary state={dehydrate(qc)}>
      <ClientLavorazioneDetailViewLazy lavorazioneId={id} />
    </GestionaleHydrationBoundary>
  );
}
