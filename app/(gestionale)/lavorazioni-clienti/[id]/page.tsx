import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ClientLavorazioneDetailViewLazy } from "@/components/gestionale/lazy-route-views";

export default async function LavorazioneClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="client-detail" />}>
      <ClientLavorazioneDetailViewLazy lavorazioneId={id} />
    </Suspense>
  );
}
