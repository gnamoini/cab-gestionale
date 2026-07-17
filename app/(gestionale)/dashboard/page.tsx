import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { DashboardDeferredHydration } from "@/components/dashboard/dashboard-deferred-hydration";
import { DashboardViewLazy } from "@/components/gestionale/lazy-route-views";

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="dashboard" />}>
      <DashboardDeferredHydration>
        <DashboardViewLazy />
      </DashboardDeferredHydration>
    </Suspense>
  );
}
