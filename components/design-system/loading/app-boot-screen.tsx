"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { CAB_COLD_START_MARK } from "@/lib/observability/cold-start-mark-names";
import { lazyMarkColdStart } from "@/lib/observability/cold-start-diagnostics-lazy";
import { CAB_LOGO_ASPECT, CAB_LOGO_PATH } from "@/components/gestionale/cab-logo";
import { LoadingSpinner } from "./loading-spinner";
import { loadingMessageClass } from "./loading-tokens";

const BOOT_MESSAGES = [
  "Avvio del gestionale...",
  "Caricamento dati...",
  "Sincronizzazione...",
  "Quasi pronto...",
] as const;

const BOOT_FADE_MS = 250;
const MESSAGE_INTERVAL_MS = 1500;
const MESSAGE_FADE_MS = 175;
const LOGO_HEIGHT = 56;

export function removeStaticAppBootLayer(): void {
  if (typeof document === "undefined") return;
  document.getElementById("cab-app-boot")?.remove();
  document.documentElement.classList.remove("cab-app-boot-active");
}

/** Schermata fullscreen cold start — dismiss quando auth !== loading. */
export function AppBootScreen() {
  const { status } = useAuth();
  const ready = status !== "loading";
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageVisible, setMessageVisible] = useState(true);
  const messageFadeTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    lazyMarkColdStart(CAB_COLD_START_MARK.appBootScreenMount);
    const staticLayer = document.getElementById("cab-app-boot");
    if (staticLayer) staticLayer.style.display = "none";
    lazyMarkColdStart(CAB_COLD_START_MARK.appBootStaticHidden);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMessageVisible(false);
      messageFadeTimerRef.current = window.setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % BOOT_MESSAGES.length);
        setMessageVisible(true);
        messageFadeTimerRef.current = null;
      }, MESSAGE_FADE_MS);
    }, MESSAGE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      if (messageFadeTimerRef.current !== null) {
        window.clearTimeout(messageFadeTimerRef.current);
      }
    };
  }, []);

   
  useEffect(() => {
    if (!ready) return;
    lazyMarkColdStart(CAB_COLD_START_MARK.appBootDismiss);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setVisible(false);
    const fadeTimerId = window.setTimeout(() => {
      removeStaticAppBootLayer();
      setMounted(false);
    }, BOOT_FADE_MS);
    return () => window.clearTimeout(fadeTimerId);
  }, [ready]);

  if (!mounted) return null;

  const logoWidth = Math.round(LOGO_HEIGHT * CAB_LOGO_ASPECT);
  const message = BOOT_MESSAGES[messageIndex];

  return (
    <div
      className={`pointer-events-auto fixed inset-0 z-[200] flex min-w-0 items-center justify-center overflow-x-hidden bg-[var(--cab-bg-app)] px-4 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      role="status"
      aria-live="polite"
      aria-busy={visible}
    >
      <div className="flex min-w-0 flex-col items-center justify-center gap-3 text-center">
        <Image
          src={CAB_LOGO_PATH}
          alt="C.A.B."
          width={logoWidth}
          height={LOGO_HEIGHT}
          priority
          sizes={`${logoWidth}px`}
          className="block shrink-0 object-contain dark:brightness-[1.08] dark:contrast-[0.95]"
        />
        <LoadingSpinner size="lg" label={message} />
        <p
          className={`max-w-[16rem] transition-opacity duration-[175ms] ease-out motion-reduce:transition-none ${loadingMessageClass} ${
            messageVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
