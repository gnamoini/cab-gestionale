import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { SistemaImpostazioniPageView } from "@/components/dashboard/sistema-impostazioni-modal";

export default function ImpostazioniPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="impostazioni" />}>
      <SistemaImpostazioniPageView />
    </Suspense>
  );
}
