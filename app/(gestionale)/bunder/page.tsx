import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { BunderViewLazy } from "@/components/gestionale/lazy-route-views";

export default function BunderPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="dipendenti" />}>
      <BunderViewLazy />
    </Suspense>
  );
}
