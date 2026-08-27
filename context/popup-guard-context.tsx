"use client";

import { useEffect } from "react";
import { registerPopupBlockedDialogHandler } from "@/lib/browser/popup-guard";
import { pushGestionaleToast } from "@/context/toast-context";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";

export function PopupGuardProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerPopupBlockedDialogHandler(() => {
      pushGestionaleToast(GESTIONALE_TOAST.popupBlocked, "warning", 5200);
    });
    return () => registerPopupBlockedDialogHandler(null);
  }, []);

  return children;
}
