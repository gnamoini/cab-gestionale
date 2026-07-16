"use client";

import { useCallback, useEffect, useState } from "react";
import { CAB_MODAL_ROOT_ATTR } from "@/lib/ui/mobile-modal-behavior";
import {
  GESTIONALE_OVERLAY_CLOSED_EVENT,
  GESTIONALE_OVERLAY_OPENED_EVENT,
  isGestionaleOverlayActive,
} from "@/lib/ui/use-sidebar-collapsed";

/** Drawer log / modale / confirm in primo piano — blocca drop pagina-toolbar. */
export function isGestionaleForegroundOverlayActive(): boolean {
  if (typeof document === "undefined") return false;
  if (isGestionaleOverlayActive()) return true;
  return document.querySelector(`[${CAB_MODAL_ROOT_ATTR}]`) != null;
}

export function useGestionaleForegroundOverlayActive(): boolean {
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    setActive(isGestionaleForegroundOverlayActive());
  }, []);

  useEffect(() => {
    let raf = 0;
    const scheduleSync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };

    scheduleSync();
    window.addEventListener(GESTIONALE_OVERLAY_OPENED_EVENT, scheduleSync);
    window.addEventListener(GESTIONALE_OVERLAY_CLOSED_EVENT, scheduleSync);
    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(GESTIONALE_OVERLAY_OPENED_EVENT, scheduleSync);
      window.removeEventListener(GESTIONALE_OVERLAY_CLOSED_EVENT, scheduleSync);
      observer.disconnect();
    };
  }, [sync]);

  return active;
}
