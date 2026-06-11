"use client";

import { useEffect, useRef } from "react";
import { registerOverlayBack } from "@/lib/ui/overlay-back-stack";

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

  useEffect(() => {
    if (!open) return;
    return registerOverlayBack(
      () => onCloseRef.current(),
      source,
      layer ? { layer } : undefined,
    );
  }, [open, source, layer]);
}
