import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { PreventiviView } from "@/components/preventivi/preventivi-view";

export default function PreventiviPage() {
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="preventivi" />}>
      <PreventiviView />
    </Suspense>
  );
}
