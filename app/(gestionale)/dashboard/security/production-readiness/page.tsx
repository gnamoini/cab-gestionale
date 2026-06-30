import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ProductionReadinessViewLazy } from "@/components/gestionale/lazy-route-views";

export default function ProductionReadinessPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="dashboard" />}>
      <ProductionReadinessViewLazy />
    </Suspense>
  );
}
