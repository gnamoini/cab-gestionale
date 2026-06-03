"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  emitDesignSystemLockWarnings,
  runDesignSystemLockOnDom,
} from "@/lib/ui-design-system-lock/design-system-lock";

const DEBOUNCE_MS = 400;

/**
 * DEV-only audit Design System Lock — warn console, zero DOM mutation.
 */
export function DesignSystemLockMount() {
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    function run() {
      const main = document.querySelector(".cab-app-shell main");
      const violations = runDesignSystemLockOnDom(main);
      emitDesignSystemLockWarnings(violations, pathname);
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
