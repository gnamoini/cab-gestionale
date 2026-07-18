"use client";

import { GestionaleCaptureStepIndicator } from "@/components/document-capture/gestionale-capture-step-indicator";
import {
  INVENTORY_RECEIVING_CAPTURE_STEPS,
  inventoryReceivingCaptureAdapter,
} from "@/lib/document-capture/inventory-receiving-capture-adapter";

export type InventoryReceivingFlowStep = "hub" | "analyze" | "review";

export function InventoryReceivingStepIndicator({ current }: { current: InventoryReceivingFlowStep }) {
  return (
    <GestionaleCaptureStepIndicator
      steps={INVENTORY_RECEIVING_CAPTURE_STEPS}
      current={current}
      ariaLabel={inventoryReceivingCaptureAdapter.ariaLabel}
    />
  );
}

export const INVENTORY_RECEIVING_STEP_COPY = inventoryReceivingCaptureAdapter.stepCopy as Record<
  InventoryReceivingFlowStep,
  { title: string; subtitle: string }
>;
