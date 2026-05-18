"use client";

import { useEffect } from "react";

/**
 * Blocca lo scroll del documento quando overlay/modal/drawer sono aperti.
 * Compensa la larghezza della scrollbar per evitare layout shift (pagina che si restringe).
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPad = document.body.style.paddingRight;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.paddingRight = prevBodyPad;
    };
  }, [active]);
}
