"use client";

import { useEffect, useRef, useState } from "react";

export function useRetryAfterCountdown(retryAfterSec: number | null): {
  remainingSec: number;
  ready: boolean;
} {
  const deadlineRef = useRef<number | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);

  useEffect(() => {
    if (retryAfterSec == null || retryAfterSec <= 0) {
      deadlineRef.current = null;
      setRemainingSec(0);
      return;
    }
    deadlineRef.current = Date.now() + retryAfterSec * 1000;
    const tick = () => {
      const deadline = deadlineRef.current;
      if (!deadline) return;
      setRemainingSec(Math.max(0, (deadline - Date.now()) / 1000));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [retryAfterSec]);

  const ready = retryAfterSec == null || remainingSec <= 0;
  return { remainingSec, ready };
}
