"use client";

import { useCallback, useRef, type Ref } from "react";

/** Ref callback stabile — evita loop quando si combina con floating-ui setReference. */
export function useMergedRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
  const refsRef = useRef(refs);
  refsRef.current = refs;

  return useCallback((node: T | null) => {
    for (const ref of refsRef.current) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else ref.current = node;
    }
  }, []);
}
