"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  registerPopupBlockedDialogHandler,
  retryPopupFromSession,
  type PopupBlockedDialogRequest,
} from "@/lib/browser/popup-guard";
import { clearPopupRetrySession } from "@/lib/browser/popup-retry-session";

const PopupBlockedDialogLazy = dynamic(
  () =>
    import("@/components/gestionale/popup-blocked-dialog").then((m) => ({
      default: m.PopupBlockedDialog,
    })),
  { ssr: false },
);

export function PopupGuardProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<PopupBlockedDialogRequest | null>(null);
  const [retryPending, setRetryPending] = useState(false);

  useEffect(() => {
    registerPopupBlockedDialogHandler((req) => setRequest(req));
    return () => registerPopupBlockedDialogHandler(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (request) clearPopupRetrySession(request.sessionId);
    setRequest(null);
    setRetryPending(false);
  }, [request]);

  const handleRetry = useCallback(async () => {
    if (!request || retryPending) return;
    setRetryPending(true);
    try {
      const result = retryPopupFromSession(request.sessionId);
      if (result.status === "opened") {
        setRequest(null);
      }
    } finally {
      setRetryPending(false);
    }
  }, [request, retryPending]);

  const dialog = useMemo(
    () => (
      <PopupBlockedDialogLazy
        open={request != null}
        request={request}
        retryPending={retryPending}
        onCancel={handleCancel}
        onRetry={handleRetry}
      />
    ),
    [handleCancel, handleRetry, request, retryPending],
  );

  return (
    <>
      {children}
      {dialog}
    </>
  );
}
