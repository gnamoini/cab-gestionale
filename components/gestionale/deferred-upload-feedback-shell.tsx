"use client";

import dynamic from "next/dynamic";
import { isUploadTrayDeferEnabled } from "@/lib/performance/defer-flags";

const UploadFeedbackPackLazy = dynamic(
  () => import("@/components/gestionale/deferred-upload-feedback-pack-inner"),
  { ssr: false },
);

/** ponytail: no static import of upload-feedback-context — async chunk only. */
export function DeferredUploadFeedbackShell({ children }: { children: React.ReactNode }) {
  if (!isUploadTrayDeferEnabled()) {
    return <>{children}</>;
  }
  return <UploadFeedbackPackLazy>{children}</UploadFeedbackPackLazy>;
}
