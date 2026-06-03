"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { buildShadowReport, emitUIOsShadowReport } from "@/lib/ui-os/ui-os-engine";

const DEBOUNCE_MS = 450;

/**
 * DEV-only UI OS shadow mode — analisi schema, zero rendering change.
 */
export function UiOsShadowMount() {
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    function run() {
      const main = document.querySelector(".cab-app-shell main");
      const report = buildShadowReport(pathname, main);
      emitUIOsShadowReport(report);
    }

    function schedule() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(run, DEBOUNCE_MS);
    }

    schedule();
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return null;
}
