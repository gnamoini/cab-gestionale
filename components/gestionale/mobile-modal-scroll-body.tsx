"use client";

import type { HTMLAttributes, ReactNode } from "react";
import {
  CAB_MODAL_SCROLL_ATTR,
  gestionaleModalScrollBodyMobileClass,
} from "@/lib/ui/mobile-modal-behavior";
import { cabModalScrollKeyboardPad } from "@/lib/ui/ios-mobile-tokens";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";

export type GestionaleModalScrollBodyProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Desktop: niente scroll sul corpo — i pannelli interni (es. colonne capture) scrollano da soli. */
  containScroll?: boolean;
};

/** Padding sul contenuto interno — il corpo scroll resta edge-to-edge (scrollbar a destra). */
export const gestionaleModalScrollContentPad =
  "min-w-0 px-2 sm:px-3 md:px-4 pt-4 pb-4";

/** Corpo scroll standard modali gestionale — su mobile lo scroll è nel shell host. */
export function GestionaleModalScrollBody({
  className = "",
  children,
  containScroll = false,
  ...rest
}: GestionaleModalScrollBodyProps) {
  const maxMdDown = useMaxMdDown();

  const bodyClass = maxMdDown
    ? "min-w-0"
    : containScroll
      ? `min-h-0 min-w-0 flex-1 overflow-hidden ${cabModalScrollKeyboardPad}`.trim()
      : `${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad} [scrollbar-gutter:auto]`.trim();

  const contentClass = containScroll
    ? `${gestionaleModalScrollContentPad} flex min-h-0 flex-1 flex-col ${className}`.trim()
    : `${gestionaleModalScrollContentPad} ${className}`.trim();

  return (
    <div
      {...rest}
      {...(!maxMdDown && !containScroll ? { [CAB_MODAL_SCROLL_ATTR]: "" } : {})}
      className={bodyClass}
    >
      <div className={contentClass}>{children}</div>
    </div>
  );
}
