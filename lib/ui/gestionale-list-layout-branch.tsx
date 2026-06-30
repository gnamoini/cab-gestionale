"use client";

import type { ReactNode } from "react";
import type { GestionaleListLayout } from "@/lib/ui/use-gestionale-list-layout";

export type GestionaleListLayoutBranchProps = {
  layout: GestionaleListLayout;
  desktop: ReactNode;
  mobile: ReactNode;
};

/** Render condizionale tabella vs card — evita doppio mount e feedback loop min-width tabella. */
export function GestionaleListLayoutBranch({ layout, desktop, mobile }: GestionaleListLayoutBranchProps) {
  return layout === "desktop" ? desktop : mobile;
}
