"use client";

import { useEffect, useState } from "react";
import {
  GLOBAL_LOADING_MESSAGES,
  type GlobalLoadingMessageKey,
} from "@/lib/ui/global-loading-messages";
import { LOADING_DELAYED_MESSAGE_MS } from "./loading-tokens";

/**
 * Mostra messaggio contestuale solo se il loading supera la soglia (default 1s).
 * Un solo timer per istanza — nessun polling.
 */
export function useDelayedLoadingMessage(
  isLoading: boolean,
  messageKey: GlobalLoadingMessageKey = "default",
): string | null {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return;
    }
    const id = window.setTimeout(() => setShow(true), LOADING_DELAYED_MESSAGE_MS);
    return () => window.clearTimeout(id);
  }, [isLoading]);

  if (!isLoading || !show) return null;
  return GLOBAL_LOADING_MESSAGES[messageKey];
}
