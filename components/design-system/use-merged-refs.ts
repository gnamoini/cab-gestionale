"use client";

/* eslint-disable react-hooks/immutability, react-hooks/use-memo -- lint phase2: merged ref callback must accept dynamic ref list */

import { useCallback, type Ref } from "react";

/** Ref callback stabile — evita loop quando si combina con floating-ui setReference. */
export function useMergedRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
  return useCallback(
    (node: T | null) => {
      for (const ref of refs) {
        if (!ref) continue;
        if (typeof ref === "function") ref(node);
        else ref.current = node;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- merge latest ref list each render
    refs,
  );
}
