import { ClientLavorazioneDetailView } from "@/components/lavorazioni-clienti/client-lavorazione-detail-view";

export default async function LavorazioneClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientLavorazioneDetailView lavorazioneId={id} />;
}
