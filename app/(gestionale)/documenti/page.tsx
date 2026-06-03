import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { DocumentiView } from "@/components/gestionale/documenti/documenti-view";

export default function DocumentiPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="documenti" />}>
      <DocumentiView />
    </Suspense>
  );
}
