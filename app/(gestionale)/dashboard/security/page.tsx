import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { SecurityDashboardViewLazy } from "@/components/gestionale/lazy-route-views";

export default function SecurityDashboardPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="dashboard" />}>
      <SecurityDashboardViewLazy />
    </Suspense>
  );
}
