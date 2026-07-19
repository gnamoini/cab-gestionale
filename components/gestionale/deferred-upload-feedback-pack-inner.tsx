"use client";

import { UploadFeedbackProvider } from "@/context/upload-feedback-context";
import { UploadFeedbackTray } from "@/components/gestionale/upload";

export default function DeferredUploadFeedbackPackInner({ children }: { children: React.ReactNode }) {
  return (
    <UploadFeedbackProvider>
      <UploadFeedbackTray />
      {children}
    </UploadFeedbackProvider>
  );
}
