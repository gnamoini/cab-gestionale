import { Suspense } from "react";
import { PageTransitionLoader } from "@/components/design-system";
import { DashboardDeferredHydration } from "@/components/dashboard/dashboard-deferred-hydration";
import { DashboardViewLazy } from "@/components/gestionale/lazy-route-views";

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageTransitionLoader />}>
      <DashboardDeferredHydration>
        <DashboardViewLazy />
      </DashboardDeferredHydration>
    </Suspense>
  );
}
