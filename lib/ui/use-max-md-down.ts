"use client";

import { useEffect, useState } from "react";

export const MAX_MD_DOWN_MQ = "(max-width: 767px)";

/** true quando viewport < breakpoint `md` (768px) — modali mobile sheet. */
export function useMaxMdDown(): boolean {
  const [maxMdDown, setMaxMdDown] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MAX_MD_DOWN_MQ);
    const sync = () => setMaxMdDown(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return maxMdDown;
}
