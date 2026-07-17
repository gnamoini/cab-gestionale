"use client";

import type { ReactNode } from "react";

type GestionaleModalGateProps = {
  open: boolean;
  children: ReactNode;
};

/** SSOT: non montare modali quando `open` è false. */
export function GestionaleModalGate({ open, children }: GestionaleModalGateProps) {
  if (!open) return null;
  return children;
}
