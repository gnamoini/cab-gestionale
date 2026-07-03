"use client";

import type { ReactNode } from "react";
import { dsSurfacePanelStatic } from "@/lib/ui/design-system";

/** Barra strumenti agenda — pannello statico coerente con Control Tower. */
export function AgendaToolbarShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${dsSurfacePanelStatic} min-h-0 gap-3 p-3 sm:p-4`}>
      {children}
    </div>
  );
}
