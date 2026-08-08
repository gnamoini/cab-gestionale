/**
 * Smoke: barrel loading design system esporta componenti attesi.
 * Verifica statica del barrel + import solo moduli TS puri (no CSS side-effect in Node).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  LOADING_DELAYED_MESSAGE_MS,
  LOADING_SPINNER_DURATION_MS,
  loadingSpinnerRingClass,
  loadingSpinnerRingGeometryClass,
} from "@/components/design-system/loading/loading-tokens";
import { SKELETON_MIN_HEIGHT } from "@/components/design-system/loading/skeleton-layout-presets";
import { useDelayedLoadingMessage } from "@/components/design-system/loading/use-delayed-loading-message";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const loadingIndex = read("components/design-system/loading/index.ts");

const EXPECTED_EXPORTS = [
  "LoadingSpinner",
  "LoadingTableSkeleton",
  "LoadingButton",
  "GlobalLoadingSpinner",
  "GlobalLoadingView",
  "LoadingView",
  "LoadingOverlay",
  "LoadingPageFallback",
  "LoadingPageSkeleton",
  "LoadingCardSkeleton",
  "LoadingFormSkeleton",
  "LoadingProgressBar",
  "LoadingStateMessage",
  "LoadingErrorState",
  "LoadingUploadProgress",
  "LoadingSuspenseFallback",
  "LoadingPageShellSkeleton",
  "SkeletonBlock",
  "SkeletonCard",
  "SkeletonTable",
  "StructuralSkeletonRenderer",
  "StructuralRouteSkeleton",
  "SkeletonBoundary",
  "SkeletonContract",
  "useDelayedLoadingMessage",
  "SKELETON_MIN_HEIGHT",
] as const;

for (const name of EXPECTED_EXPORTS) {
  assert.match(loadingIndex, new RegExp(`\\b${name}\\b`), `export mancante nel barrel loading: ${name}`);
}

assert.equal(typeof useDelayedLoadingMessage, "function");
assert.equal(LOADING_DELAYED_MESSAGE_MS, 1000);
assert.equal(LOADING_SPINNER_DURATION_MS, 1000);
assert.match(loadingSpinnerRingClass, /\bcab-spinner-ring\b/);
assert.doesNotMatch(loadingSpinnerRingClass, /\banimate-spin\b/);
assert.match(loadingSpinnerRingGeometryClass, /\bborder-2\b/);
assert.match(loadingSpinnerRingGeometryClass, /\brounded-full\b/);
assert.ok(GLOBAL_LOADING_MESSAGES.lavorazioni.includes("lavorazioni"));
assert.ok(GLOBAL_LOADING_MESSAGES.magazzino.includes("magazzino"));
assert.ok(GLOBAL_LOADING_MESSAGES.documenti.includes("documenti"));
assert.ok(GLOBAL_LOADING_MESSAGES.clienti.includes("clienti"));
assert.ok(GLOBAL_LOADING_MESSAGES.permessi.includes("permessi"));
assert.ok(SKELETON_MIN_HEIGHT.tableDesktop);

console.log("loading-design-system.test: OK");
