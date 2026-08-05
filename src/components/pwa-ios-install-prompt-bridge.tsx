"use client";

import { useEffect, useState } from "react";
import { isIosSafari, isPwaStandalone } from "@/lib/pwa/pwa-mobile";

const DISMISS_KEY = "cab-pwa-ios-install-dismissed";

export function PwaIosInstallPromptBridge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isIosSafari() || isPwaStandalone()) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[var(--z-pwa-optin)] mx-auto max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-3 shadow-lg">
      <p className="text-sm text-[var(--text-primary)]">
        Per ricevere notifiche su iPhone, aggiungi il gestionale alla schermata Home, poi abilita le
        notifiche push.
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          className="text-sm text-[var(--text-secondary)]"
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
