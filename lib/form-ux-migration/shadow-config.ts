/** Debounce window for shadow onChange evaluation (150–300ms range). */
export const FORM_UX_SHADOW_DEBOUNCE_MS = 200;

/** Mismatch rate threshold for enforcement downgrade (2%). */
export const FORM_UX_MISMATCH_RATE_THRESHOLD = 0.02;

/** Sliding window for mismatch rate calculation (5 min). */
export const FORM_UX_MISMATCH_RATE_WINDOW_MS = 300_000;

/** Hydration mismatch spike threshold per field in 60s. */
export const FORM_UX_HYDRATION_SPIKE_THRESHOLD = 3;

export const FORM_UX_HYDRATION_SPIKE_WINDOW_MS = 60_000;

/** Auto-rollback: mismatch rate threshold (5% in 60s). */
export const FORM_UX_AUTO_ROLLBACK_MISMATCH_RATE = 0.05;

export const FORM_UX_AUTO_ROLLBACK_WINDOW_MS = 60_000;

/** Auto-rollback: submit divergence rate threshold (2%). */
export const FORM_UX_AUTO_ROLLBACK_SUBMIT_DIVERGENCE_RATE = 0.02;

/** Guard: mismatch rate threshold for downgrade suggestion. */
export const FORM_UX_GUARD_MISMATCH_RATE = 0.03;

/** Guard: submit divergence rate threshold for rollback suggestion. */
export const FORM_UX_GUARD_SUBMIT_DIVERGENCE_RATE = 0.02;

/** iOS focus/blur loop: blur events without change in window. */
export const FORM_UX_IOS_FOCUS_BLUR_LOOP_THRESHOLD = 4;

export const FORM_UX_IOS_FOCUS_BLUR_LOOP_WINDOW_MS = 2_000;
