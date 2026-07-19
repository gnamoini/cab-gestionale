import { Suspense } from "react";
import { ProductionReadinessViewLazy } from "@/components/gestionale/lazy-route-views";

export default function SicurezzaProductionReadinessPage() {
  return (
    <Suspense fallback={null}>
      <ProductionReadinessViewLazy />
    </Suspense>
  );
}
