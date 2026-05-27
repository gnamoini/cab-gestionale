"use client";

import {
  GlobalLoadingOverlay,
  GlobalLoadingSpinner,
  GlobalLoadingView,
} from "@/components/design-system/global-loading";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";

/** @deprecated Usare `GlobalLoadingSpinner`. */
export function LoadingSpinner({ label = GLOBAL_LOADING_MESSAGES.default }: { label?: string }) {
  return <GlobalLoadingSpinner size="md" label={label} />;
}

/** Overlay route-level — delega al loading globale (stesso aspetto). */
export function PageLoadingOverlay({
  show,
  label = GLOBAL_LOADING_MESSAGES.page,
}: {
  show: boolean;
  label?: string;
}) {
  return <GlobalLoadingOverlay visible={show} message={label} />;
}

export { GlobalLoadingView, GlobalLoadingOverlay, GlobalLoadingSpinner };
