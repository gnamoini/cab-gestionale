import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ReportView } from "@/components/gestionale/report/report-view";
import { UIPageAdapter } from "@/lib/ui-os";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";

export default function ReportPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="report" />}>
      <UIPageAdapter page="/report" mode="os" fallback="legacy" schema={getSuggestedSchema("/report")}>
        <ReportView />
      </UIPageAdapter>
    </Suspense>
  );
}
