"use client";

import { memo } from "react";
import { PwaOfflineBlockBanner } from "@/src/components/pwa-offline-block-banner";

/** Solo banner offline — niente Context Provider, niente listener rete. */
export const PwaConnectivityGate = memo(function PwaConnectivityGate() {
  return <PwaOfflineBlockBanner />;
});
