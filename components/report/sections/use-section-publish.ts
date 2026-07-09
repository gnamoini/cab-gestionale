"use client";

import { useEffect, useRef } from "react";

export function useSectionPublishRequest(): () => number {
  const ref = useRef(0);
  return () => {
    ref.current += 1;
    return ref.current;
  };
}

export function usePublishWhenReady(
  enabled: boolean,
  deps: unknown[],
  publish: (requestId: number) => void,
) {
  const nextRequest = useSectionPublishRequest();
  useEffect(() => {
    if (!enabled) return;
    publish(nextRequest());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional domain rebuild deps
  }, [enabled, ...deps]);
}
