import type { Metadata } from "next";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { ClientLavorazioneDetailViewLazy } from "@/components/gestionale/lazy-route-views";
import { fetchClientPortalDetailDTOServer } from "@/lib/bff/client-portal-detail-fetch-server";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import { buildPageMetadata, formatPageTitle } from "@/lib/site/app-page-metadata";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { QK } from "@/src/lib/react-query/query-keys";
import type { ClientLavorazioneDetail } from "@/src/services/client-lavorazioni.service";

type PageProps = { params: Promise<{ id: string }> };

async function resolveClientPortalDetailTitle(id: string): Promise<string> {
  const res = await fetchClientPortalDetailDTOServer(id.trim());
  if (!res.success || !res.data?.row) return "Portale clienti";
  const codice = lavorazioneDisplayCodice({ id: res.data.row.id, codice: res.data.row.codice });
  if (!codice) return "Portale clienti";
  return formatPageTitle(`Lavorazione ${codice}`, "Portale clienti");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const title = await resolveClientPortalDetailTitle(id);
  return buildPageMetadata(title, { description: "Dettaglio lavorazione nel portale clienti" });
}

export default async function LavorazioneClienteDetailPage({ params }: PageProps) {
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
