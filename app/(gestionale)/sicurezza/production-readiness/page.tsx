import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ProductionReadinessViewLazy } from "@/components/gestionale/lazy-route-views";

export default function SicurezzaProductionReadinessPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="production-readiness" />}>
      <ProductionReadinessViewLazy />
    </Suspense>
  );
}
