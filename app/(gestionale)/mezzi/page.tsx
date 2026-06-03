import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { MezziView } from "@/components/gestionale/mezzi/mezzi-view";

export default function MezziPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="mezzi" />}>
      <MezziView />
    </Suspense>
  );
}
