"use client";

import { useEffect, useState } from "react";

const SM_MQ = "(min-width: 640px)";

/** true quando viewport ≥ breakpoint `sm` (640px). */
export function useSmUp(): boolean {
  const [smUp, setSmUp] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(SM_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(SM_MQ);
    const sync = () => setSmUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return smUp;
}
