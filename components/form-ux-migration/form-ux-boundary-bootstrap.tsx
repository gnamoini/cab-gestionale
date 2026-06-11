"use client";

import { installFormUxGlobalInterceptors } from "@/lib/form-ux-migration/form-ux-boundary-gate";
import { useEffect } from "react";

export function FormUxBoundaryBootstrap() {
  useEffect(() => {
    const cleanup = installFormUxGlobalInterceptors();
    return cleanup;
  }, []);

  return null;
}
