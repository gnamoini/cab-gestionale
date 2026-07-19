"use client";

import dynamic from "next/dynamic";
import { isDataStaleBannerDeferEnabled } from "@/lib/performance/defer-flags";

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
  return <DataStaleBannerLazy />;
}
