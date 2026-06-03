import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { DipendentiView } from "@/components/gestionale/dipendenti/dipendenti-view";

export default function DipendentiPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="dipendenti" />}>
      <DipendentiView />
    </Suspense>
  );
}
