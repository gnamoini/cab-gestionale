import { Suspense } from "react";
import { GlobalLoadingPageFallback } from "@/components/design-system";
import { MagazzinoView } from "@/components/gestionale/magazzino/magazzino-view";

export default function MagazzinoPage() {
  return (
    <Suspense fallback={<GlobalLoadingPageFallback />}>
      <MagazzinoView />
    </Suspense>
  );
}
