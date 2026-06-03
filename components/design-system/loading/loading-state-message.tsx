"use client";

import { memo } from "react";
import {
  GLOBAL_LOADING_MESSAGES,
  type GlobalLoadingMessageKey,
} from "@/lib/ui/global-loading-messages";
import { loadingMessageClass } from "./loading-tokens";
import { useDelayedLoadingMessage } from "./use-delayed-loading-message";

export type LoadingStateMessageProps = {
  isLoading: boolean;
  messageKey?: GlobalLoadingMessageKey;
  /** Se true, mostra subito (es. overlay). Default: ritardo 1s. */
  immediate?: boolean;
  message?: string;
  className?: string;
};

export const LoadingStateMessage = memo(function LoadingStateMessage({
  isLoading,
  messageKey = "default",
  immediate = false,
  message,
  className = "",
}: LoadingStateMessageProps) {
  const delayed = useDelayedLoadingMessage(isLoading, messageKey);
  const text =
    message ??
    (immediate ? GLOBAL_LOADING_MESSAGES[messageKey] : delayed);

  if (!isLoading || !text) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className={`${loadingMessageClass} ${className}`.trim()}
    >
      {text}
    </p>
  );
});
