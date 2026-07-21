"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { OverlayLayerPriority, registerOverlayBack } from "@/lib/ui/overlay-back-stack";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type UseSelectorOverlayBackOptions = {
  open: boolean;
  onClose: () => void;
  source?: string;
  /** Fase 4: layer priority opt-in */
  layer?: "selector";
};

/**
 * Registra overlay back per selector — un solo registrar per surface aperta.
 */
export function useSelectorOverlayBack({
  open,
  onClose,
  source = "selector",
  layer,
}: UseSelectorOverlayBackOptions): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    return registerOverlayBack(
      () => onCloseRef.current(),
      source,
      layer
        ? { layer, priority: OverlayLayerPriority.selector, blocksGestures: false }
        : undefined,
    );
  }, [open, source, layer]);
}
