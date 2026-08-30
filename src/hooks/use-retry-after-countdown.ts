"use client";

/* eslint-disable react-hooks/refs, react-hooks/purity -- lint phase2: countdown deadline synced from retryAfterSec during render */

import { useEffect, useRef, useState } from "react";

export function useRetryAfterCountdown(retryAfterSec: number | null): {
  remainingSec: number;
  ready: boolean;
} {
  const deadlineRef = useRef<number | null>(null);
  const lastRetryRef = useRef(retryAfterSec);
  const [, setTick] = useState(0);

  if (lastRetryRef.current !== retryAfterSec) {
    lastRetryRef.current = retryAfterSec;
    deadlineRef.current =
      retryAfterSec != null && retryAfterSec > 0 ? Date.now() + retryAfterSec * 1000 : null;
  }

  const remainingSec = deadlineRef.current
    ? Math.max(0, (deadlineRef.current - Date.now()) / 1000)
    : 0;

  useEffect(() => {
    if (!deadlineRef.current) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [retryAfterSec]);

  const ready = retryAfterSec == null || remainingSec <= 0;
  return { remainingSec, ready };
}
