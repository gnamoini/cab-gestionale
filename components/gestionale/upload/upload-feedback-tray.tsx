"use client";

import { GlobalLoadingSpinner } from "@/components/design-system/loading-indicator";
import { useUploadFeedback } from "@/context/upload-feedback-context";
import { UPLOAD_MESSAGES } from "@/lib/upload/upload-feedback-messages";
import { dsBtnGhost, dsZToast } from "@/lib/ui/design-system";

/** Pannello globale upload attivi (sopra i toast, non invasivo). */
export function UploadFeedbackTray() {
  const { items, clearItem } = useUploadFeedback();
  const visible = items.filter((x) => x.phase !== "idle");

  if (visible.length === 0) return null;

  return (
    <div
      className={`pointer-events-none fixed bottom-0 left-0 flex max-h-[min(40dvh,18rem)] w-full max-w-sm flex-col gap-2 overflow-hidden p-3 sm:max-w-md sm:p-4 ${dsZToast}`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      aria-live="polite"
      aria-relevant="additions"
    >
      {visible.map((item) => (
        <div
          key={item.id}
          role="status"
          className="pointer-events-auto flex items-start gap-2 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] py-2 pl-2.5 pr-2 shadow-[var(--cab-shadow-md)]"
        >
          {item.phase === "uploading" || item.phase === "selected" ? (
            <GlobalLoadingSpinner size="sm" className="mt-0.5" label={UPLOAD_MESSAGES.uploading} />
          ) : item.phase === "success" ? (
            <span className="mt-0.5 shrink-0 text-sm font-bold text-[color:var(--cab-success)]" aria-hidden>
              ✓
            </span>
          ) : (
            <span className="mt-0.5 shrink-0 text-sm font-bold text-[color:var(--cab-danger)]" aria-hidden>
              !
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[color:var(--cab-text)]">{item.label}</p>
            <p className="text-[11px] text-[color:var(--cab-text-muted)]">
              {item.phase === "uploading" || item.phase === "selected"
                ? UPLOAD_MESSAGES.uploading
                : item.phase === "success"
                  ? UPLOAD_MESSAGES.success
                  : item.error ?? "Errore"}
            </p>
            {item.phase === "error" && item.retry ? (
              <button
                type="button"
                className={`${dsBtnGhost} mt-1 px-1.5 py-0.5 text-[11px]`}
                onClick={item.retry}
              >
                {UPLOAD_MESSAGES.retry}
              </button>
            ) : null}
          </div>
          {item.phase === "success" || item.phase === "error" ? (
            <button
              type="button"
              className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)]"
              onClick={() => clearItem(item.id)}
              aria-label={UPLOAD_MESSAGES.dismiss}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
