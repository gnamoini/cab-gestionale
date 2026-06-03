import { dsSkeletonPulse, dsTypoCaption, dsTypoSmall } from "@/lib/ui/design-system";

/** Durata animazione spinner — unico punto di modifica. */
export const LOADING_SPINNER_DURATION_MS = 300;

/** Ritardo prima di mostrare messaggio informativo contestuale. */
export const LOADING_DELAYED_MESSAGE_MS = 1000;

export const loadingSpinnerSizeClass = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

export type LoadingSpinnerSize = keyof typeof loadingSpinnerSizeClass;

export const loadingSpinnerRingClass =
  "animate-spin rounded-full border-2 border-[color:color-mix(in_srgb,var(--cab-border)_90%,transparent)] border-t-[var(--cab-primary)]";

export const loadingSkeletonPulseClass = dsSkeletonPulse;

export const loadingMessageClass = `${dsTypoSmall} font-medium leading-snug text-[color:var(--cab-text-muted)]`;

export const loadingCaptionClass = `${dsTypoCaption} text-[color:var(--cab-text-muted)]`;

export const loadingProgressTrackClass =
  "h-1.5 w-full overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--cab-text-muted)_12%,var(--cab-surface-2))]";

export const loadingProgressFillClass =
  "h-full rounded-full bg-[color:var(--cab-primary)] transition-[width] duration-200 ease-out";

export const loadingProgressIndeterminateClass =
  "h-full w-1/3 animate-pulse rounded-full bg-[color:var(--cab-primary)]";
