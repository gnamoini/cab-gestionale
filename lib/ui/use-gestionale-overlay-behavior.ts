"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { useMobileModalKeyboard } from "@/lib/ui/use-mobile-modal-keyboard";
import { useOverlayBackHandler } from "@/lib/ui/use-overlay-back-handler";
import type { RegisterOverlayBackOptions } from "@/lib/ui/overlay-back-stack";
import type { OverlayCloseContext } from "@/lib/ui/overlay-back-stack";

export type UseGestionaleOverlayBehaviorOptions = {
  open: boolean;
  onRequestClose: (ctx?: OverlayCloseContext) => void;
  /** Identificativo per debug scroll lock. */
  source?: string;
  lockScroll?: boolean;
  /** Default true — GSheet passa false per dedup con parent selector. */
  registerBack?: boolean;
  overlayBack?: Omit<RegisterOverlayBackOptions, "beforeBack">;
};

/**
 * Comportamento overlay standard: body scroll lock, back handler, keyboard pad mobile.
 * Usare su drawer/filter/confirm con `data-cab-modal-root` sul pannello.
 */
export function useGestionaleOverlayBehavior({
  open,
  onRequestClose,
  source = "gestionale-overlay",
  lockScroll = true,
  registerBack = true,
  overlayBack,
}: UseGestionaleOverlayBehaviorOptions): RefObject<HTMLDivElement | null> {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useBodyScrollLock(lockScroll && open, source);
  useOverlayBackHandler(open && registerBack, onRequestClose, source, overlayBack);
  useMobileModalKeyboard(rootRef);

  return rootRef;
}
