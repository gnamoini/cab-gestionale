import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="dashboard" />}>
      <DashboardView />
    </Suspense>
  );
}
