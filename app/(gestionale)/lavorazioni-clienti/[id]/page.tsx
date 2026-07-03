import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ClientLavorazioneDetailView } from "@/components/lavorazioni-clienti/client-lavorazione-detail-view";

export default async function LavorazioneClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="client-detail" />}>
      <ClientLavorazioneDetailView lavorazioneId={id} />
    </Suspense>
  );
}
