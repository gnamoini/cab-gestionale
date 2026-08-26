import { PageLayout } from "@/components/design-system";
import { SkeletonBlock } from "@/components/design-system/loading/skeleton-primitives";

export default function IdentificaRicambioLoading() {
  return (
    <PageLayout title="Identifica ricambio">
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonBlock className="h-[480px] w-full rounded-xl" />
        <SkeletonBlock className="h-[480px] w-full rounded-xl" />
      </div>
    </PageLayout>
  );
}
