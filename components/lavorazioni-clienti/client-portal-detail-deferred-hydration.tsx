import { dehydrate, QueryClient } from "@tanstack/react-query";
import { fetchClientPortalDetailDTOServer } from "@/lib/bff/client-portal-detail-fetch-server";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { QK } from "@/src/lib/react-query/query-keys";
import type { ClientLavorazioneDetail } from "@/src/services/client-lavorazioni.service";

type Props = {
  lavorazioneId: string;
  children: React.ReactNode;
};

export async function ClientPortalDetailDeferredHydration({ lavorazioneId, children }: Props) {
  const qc = new QueryClient();
  const id = lavorazioneId.trim();
  const res = await fetchClientPortalDetailDTOServer(id);
  if (res.success && res.data) {
    qc.setQueryData<ClientLavorazioneDetail>([...QK.clientLavorazioniDetail, id] as const, res.data);
  }
  return <GestionaleHydrationBoundary state={dehydrate(qc)}>{children}</GestionaleHydrationBoundary>;
}
