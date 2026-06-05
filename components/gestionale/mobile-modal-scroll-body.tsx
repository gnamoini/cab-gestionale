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
};

/** Padding sul contenuto interno — il corpo scroll resta edge-to-edge (scrollbar a destra). */
export const gestionaleModalScrollContentPad =
  "min-w-0 px-2 sm:px-3 md:px-4 pt-4 pb-4";

/** Corpo scroll standard modali gestionale — su mobile lo scroll è nel shell host. */
export function GestionaleModalScrollBody({
  className = "",
  children,
  ...rest
}: GestionaleModalScrollBodyProps) {
  const maxMdDown = useMaxMdDown();

  return (
    <div
      {...rest}
      {...(!maxMdDown ? { [CAB_MODAL_SCROLL_ATTR]: "" } : {})}
      className={
        maxMdDown
          ? "min-w-0"
          : `${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad} [scrollbar-gutter:auto]`.trim()
      }
    >
      <div className={`${gestionaleModalScrollContentPad} ${className}`.trim()}>{children}</div>
    </div>
  );
}
