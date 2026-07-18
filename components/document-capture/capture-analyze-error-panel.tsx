"use client";

import {
  GEMINI_API_USAGE_URL,
  isGeminiQuotaErrorMessage,
} from "@/lib/ai/gemini-retry-after";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import { useRetryAfterCountdown } from "@/src/hooks/use-retry-after-countdown";

type Props = {
  error: string | null;
  retryAfterSec?: number | null;
  retryLabel?: string;
  onRetry?: () => void;
};

export function CaptureAnalyzeErrorPanel({
  error,
  retryAfterSec = null,
  retryLabel = "Riprova analisi",
  onRetry,
}: Props) {
  const { remainingSec, ready } = useRetryAfterCountdown(retryAfterSec);
  const showCountdown = retryAfterSec != null && remainingSec > 0;
  const showUsageLink = Boolean(error && isGeminiQuotaErrorMessage(error));

  if (!error) return null;

  return (
    <div className="space-y-2" role="alert">
      <p className="text-sm text-[color:var(--cab-danger)]">{error}</p>
      {showUsageLink ? (
        <a
          href={GEMINI_API_USAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-[color:var(--cab-primary)] underline underline-offset-2 hover:opacity-90"
        >
          Controlla utilizzo API Gemini
        </a>
      ) : null}
      {showCountdown ? (
        <p className="text-xs text-[color:var(--cab-text-muted)]">Puoi riprovare tra {remainingSec}s</p>
      ) : null}
      {onRetry && ready ? (
        <button type="button" className={dsBtnNeutral} onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
