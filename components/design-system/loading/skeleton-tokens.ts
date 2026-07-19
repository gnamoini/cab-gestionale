/**
 * Token visivi structural skeleton — re-export SSOT pulse/aria.
 */
export {
  loadingSkeletonPulseClass as skeletonPulseClass,
  LOADING_SPINNER_DURATION_MS,
  LOADING_DELAYED_MESSAGE_MS,
} from "./loading-tokens";

/** Animazione skeleton — solo CSS, reduced-motion safe. */
export const skeletonMotionClass = "motion-safe:animate-pulse motion-reduce:animate-none";
