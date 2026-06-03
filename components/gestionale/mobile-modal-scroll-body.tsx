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
      className={`${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
