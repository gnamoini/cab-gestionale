"use client";

import type { HTMLAttributes, ReactNode } from "react";
import {
  CAB_MODAL_SCROLL_ATTR,
  gestionaleModalScrollBodyMobileClass,
} from "@/lib/ui/mobile-modal-behavior";
import { cabModalScrollKeyboardPad } from "@/lib/ui/ios-mobile-tokens";

export type GestionaleModalScrollBodyProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** Padding sul contenuto interno — il corpo scroll resta edge-to-edge (scrollbar a destra). */
export const gestionaleModalScrollContentPad =
  "min-w-0 px-2 sm:px-3 md:px-4 pt-4 pb-4";

/** Corpo scroll standard modali gestionale — keyboard-aware su mobile. */
export function GestionaleModalScrollBody({
  className = "",
  children,
  ...rest
}: GestionaleModalScrollBodyProps) {
  return (
    <div
      {...rest}
      {...{ [CAB_MODAL_SCROLL_ATTR]: "" }}
      className={`${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad} [scrollbar-gutter:auto] max-md:scroll-pt-1`.trim()}
    >
      <div className={`${gestionaleModalScrollContentPad} ${className}`.trim()}>{children}</div>
    </div>
  );
}
