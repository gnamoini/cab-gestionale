"use client";

/* eslint-disable no-restricted-properties -- dev-only shim that patches legacy window.alert/confirm/prompt */
import { useEffect } from "react";
import {
  isUxEnforcementDevMode,
  warnLegacyDialogApi,
} from "@/src/lib/ux/interaction-enforcement";

/**
 * Enforcement runtime (dev only):
 * - blocca window.alert/confirm/prompt legacy
 * - mostra warning espliciti per prevenire regressioni UX
 */
export function DevUxEnforcementGuard() {
  useEffect(() => {
    if (!isUxEnforcementDevMode()) return;
    if (typeof window === "undefined") return;

    const originalAlert = window.alert.bind(window);
    const originalConfirm = window.confirm.bind(window);
    const originalPrompt = window.prompt.bind(window);

    window.alert = ((message?: unknown) => {
      void message;
      warnLegacyDialogApi("alert");
      // In dev blocchiamo il comportamento legacy.
      return;
    }) as typeof window.alert;

    window.confirm = ((message?: string) => {
      void message;
      warnLegacyDialogApi("confirm");
      // Fail-safe non distruttivo.
      return false;
    }) as typeof window.confirm;

    window.prompt = ((message?: string, defaultValue?: string) => {
      void message;
      void defaultValue;
      warnLegacyDialogApi("prompt");
      return null;
    }) as typeof window.prompt;

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
      window.prompt = originalPrompt;
    };
  }, []);

  return null;
}
