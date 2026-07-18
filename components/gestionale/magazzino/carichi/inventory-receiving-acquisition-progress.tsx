"use client";

import { CaptureAcquisitionProgress } from "@/components/document-capture/capture-acquisition-progress-panel";
import type { InventoryReceivingAcquisitionState } from "@/lib/inventory-receiving/inventory-receiving-acquisition-progress";

export function InventoryReceivingAcquisitionProgress({
  state,
}: {
  state: InventoryReceivingAcquisitionState;
}) {
  return <CaptureAcquisitionProgress variant={{ mode: "checklist", state }} />;
}
