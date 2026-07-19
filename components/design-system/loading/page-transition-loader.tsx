import { loadingSpinnerRingClass, loadingSpinnerSizeClass } from "./loading-tokens";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

/**
 * Fallback Suspense minimale — copre gap chunk/hydration senza skeleton full-page.
 * RSC-safe: zero hook, zero client boundary.
 */
export function PageTransitionLoader() {
  return (
    <div
      className={`flex items-center justify-center ${SKELETON_MIN_HEIGHT.transitionBody}`}
      role="status"
      aria-label="Caricamento pagina"
      data-testid="page-transition-loader"
    >
      <span
        className={`${loadingSpinnerSizeClass.sm} ${loadingSpinnerRingClass}`}
        aria-hidden
      />
    </div>
  );
}
