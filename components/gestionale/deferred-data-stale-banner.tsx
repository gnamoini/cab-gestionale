"use client";

import dynamic from "next/dynamic";
import { isDataStaleBannerDeferEnabled } from "@/lib/performance/defer-flags";
import { installGestionaleDirtyE2eHook } from "@/lib/sync/gestionale-dirty-e2e-hook";

const DataStaleBannerLazy = dynamic(
  () =>
    import("@/components/gestionale/data-stale-banner").then((m) => ({
      default: m.DataStaleBanner,
    })),
  { ssr: false },
);

/** ponytail: no static import of data-stale-banner. */
export function DeferredDataStaleBanner() {
  if (!isDataStaleBannerDeferEnabled()) return null;
  installGestionaleDirtyE2eHook();
  return <DataStaleBannerLazy />;
}
