import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { MagazzinoView } from "@/components/gestionale/magazzino/magazzino-view";
import { UIPageAdapter } from "@/lib/ui-os";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";

export default function MagazzinoPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="magazzino" />}>
      <UIPageAdapter
        page="/magazzino"
        mode="os"
        fallback="legacy"
        schema={getSuggestedSchema("/magazzino")}
      >
        <MagazzinoView />
      </UIPageAdapter>
    </Suspense>
  );
}
