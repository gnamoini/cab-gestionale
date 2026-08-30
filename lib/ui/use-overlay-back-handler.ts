"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  clearOverlayBackResync,
  ensureOverlayBackResync,
  registerOverlayBack,
  type OverlayCloseContext,
  type RegisterOverlayBackOptions,
} from "@/lib/ui/overlay-back-stack";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Collega un overlay aperto allo stack Indietro (History API).
 * Alla chiusura programmatica sincronizza history senza doppia chiusura.
 */
export function useOverlayBackHandler(
  active: boolean,
  onClose: (ctx?: OverlayCloseContext) => void,
  source?: string,
  opts?: RegisterOverlayBackOptions,
): void {
  const onCloseRef = useRef(onClose);
  const beforeBackRef = useRef(opts?.beforeBack);
  const resyncCleanupRef = useRef<(() => void) | null>(null);
  const optsRef = useRef(opts);

  useIsomorphicLayoutEffect(() => {
    onCloseRef.current = onClose;
    beforeBackRef.current = opts?.beforeBack;
    optsRef.current = opts;
  });

  useIsomorphicLayoutEffect(() => {
    if (!active) return;

    const handleClose = (ctx?: OverlayCloseContext) => {
      const beforeBack = beforeBackRef.current;
      if (!beforeBack) {
        onCloseRef.current(ctx);
        return;
      }

      void (async () => {
        let proceed = false;
        try {
          proceed = await beforeBack(ctx);
        } catch {
          proceed = false;
        }
        if (!proceed) {
          if (ctx?.fromPopstate) {
            ensureOverlayBackResync(
              resyncCleanupRef,
              handleClose,
              source ?? "overlay",
              {
                layer: optsRef.current?.layer,
                priority: optsRef.current?.priority,
                blocksGestures: optsRef.current?.blocksGestures,
              },
            );
          }
          return;
        }
        clearOverlayBackResync(resyncCleanupRef);
        onCloseRef.current(ctx);
      })();
    };

    const cleanup = registerOverlayBack(handleClose, source, optsRef.current);

    return () => {
      clearOverlayBackResync(resyncCleanupRef);
      cleanup();
    };
  }, [active, source, opts?.layer, opts?.priority, opts?.blocksGestures]);
}
