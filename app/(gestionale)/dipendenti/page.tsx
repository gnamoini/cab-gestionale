import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { DipendentiViewLazy } from "@/components/gestionale/lazy-route-views";

export default function DipendentiPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="dipendenti" />}>
      <DipendentiViewLazy />
    </Suspense>
  );
}
