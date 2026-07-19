"use client";

import dynamic from "next/dynamic";
import { isFormUxBootstrapDeferEnabled } from "@/lib/performance/defer-flags";

const FormUxBoundaryBootstrapLazy = dynamic(
  () =>
    import("@/components/form-ux-migration/form-ux-boundary-bootstrap").then((m) => ({
      default: m.FormUxBoundaryBootstrap,
    })),
  { ssr: false },
);

/** ponytail: no static import — form-ux-boundary-gate stays in async chunk. Build flag OFF → swap to sync import in layout. */
export function DeferredFormUxBoundaryBootstrap() {
  if (!isFormUxBootstrapDeferEnabled()) return null;
  return <FormUxBoundaryBootstrapLazy />;
}
