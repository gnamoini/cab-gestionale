"use client";

import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import {
  GlobalLoadingOverlay,
  GlobalLoadingSpinner,
  GlobalLoadingView,
  LoadingOverlay,
  LoadingSpinner,
} from "@/components/design-system/loading";

/** @deprecated Usare `LoadingSpinner` / `GlobalLoadingSpinner`. */
export function LoadingSpinnerDeprecated({ label = GLOBAL_LOADING_MESSAGES.default }: { label?: string }) {
  return <LoadingSpinner size="md" label={label} />;
}

/** Overlay route-level — delega al loading globale (stesso aspetto). */
export function PageLoadingOverlay({
  show,
  label = GLOBAL_LOADING_MESSAGES.page,
}: {
  show: boolean;
  label?: string;
}) {
  return <LoadingOverlay visible={show} message={label} />;
}

/** @deprecated Usare `LoadingSpinnerDeprecated` o import diretto da `./loading`. */
export { LoadingSpinnerDeprecated as LoadingSpinner };
export { GlobalLoadingView, GlobalLoadingOverlay, GlobalLoadingSpinner };
