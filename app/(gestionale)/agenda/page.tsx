import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { AgendaOfficinaViewLazy } from "@/components/gestionale/lazy-route-views";

export default function AgendaPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="agenda" />}>
      <AgendaOfficinaViewLazy />
    </Suspense>
  );
}
