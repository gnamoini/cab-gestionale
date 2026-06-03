/**
 * Smoke: barrel loading design system esporta componenti attesi.
 */
import assert from "node:assert/strict";
import {
  LOADING_DELAYED_MESSAGE_MS,
  LoadingButton,
  LoadingCardSkeleton,
  LoadingErrorState,
  LoadingFormSkeleton,
  LoadingOverlay,
  LoadingPageFallback,
  LoadingPageShellSkeleton,
  LoadingPageSkeleton,
  LoadingProgressBar,
  LoadingSkeleton,
  LoadingSpinner,
  LoadingStateMessage,
  LoadingSuspenseFallback,
  LoadingTableSkeleton,
  LoadingUploadProgress,
  LoadingView,
  GlobalLoadingSpinner,
  GlobalLoadingView,
  SkeletonBlock,
  SkeletonCard,
  SkeletonTable,
  SKELETON_MIN_HEIGHT,
  useDelayedLoadingMessage,
} from "@/components/design-system/loading";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";

function main(): void {
  assert.ok(LoadingSpinner);
  assert.ok(LoadingTableSkeleton);
  assert.ok(LoadingButton);
  assert.equal(typeof useDelayedLoadingMessage, "function");
  assert.ok(GlobalLoadingSpinner);
  assert.ok(GlobalLoadingView);
  assert.equal(LOADING_DELAYED_MESSAGE_MS, 1000);
  assert.ok(GLOBAL_LOADING_MESSAGES.lavorazioni.includes("lavorazioni"));
  assert.ok(GLOBAL_LOADING_MESSAGES.magazzino.includes("magazzino"));
  assert.ok(GLOBAL_LOADING_MESSAGES.documenti.includes("documenti"));
  assert.ok(GLOBAL_LOADING_MESSAGES.clienti.includes("clienti"));
  assert.ok(GLOBAL_LOADING_MESSAGES.permessi.includes("permessi"));
  assert.ok(LoadingView);
  assert.ok(LoadingOverlay);
  assert.ok(LoadingPageFallback);
  assert.ok(LoadingPageSkeleton);
  assert.ok(LoadingCardSkeleton);
  assert.ok(LoadingFormSkeleton);
  assert.ok(LoadingProgressBar);
  assert.ok(LoadingStateMessage);
  assert.ok(LoadingErrorState);
  assert.ok(LoadingUploadProgress);
  assert.ok(LoadingSuspenseFallback);
  assert.ok(LoadingPageShellSkeleton);
  assert.ok(SkeletonBlock);
  assert.ok(SkeletonCard);
  assert.ok(SkeletonTable);
  assert.ok(SKELETON_MIN_HEIGHT.bunderList);
  console.log("loading-design-system.test: OK");
}

main();
