"use client";

import { LoadingUploadProgress } from "@/components/design-system/loading";
import { useUploadFeedback } from "@/context/upload-feedback-context";
import { dsZToast } from "@/lib/ui/design-system";

/** Pannello globale upload attivi (sopra i toast, non invasivo). */
export function UploadFeedbackTray() {
  const { items, clearItem } = useUploadFeedback();
  const visible = items.filter((x) => x.phase !== "idle");

  if (visible.length === 0) return null;

  return (
    <div
      className={`pointer-events-none fixed bottom-0 left-0 flex min-w-0 max-h-[min(40dvh,18rem)] w-full max-w-sm flex-col gap-2 overflow-hidden p-3 sm:max-w-md sm:p-4 ${dsZToast}`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      aria-live="polite"
      aria-relevant="additions"
    >
      {visible.map((item) => (
        <LoadingUploadProgress
          key={item.id}
          fileName={item.fileName}
          label={item.label}
          phase={item.phase}
          progress={item.progress}
          error={item.error}
          onRetry={item.retry}
          onDismiss={() => clearItem(item.id)}
        />
      ))}
    </div>
  );
}
