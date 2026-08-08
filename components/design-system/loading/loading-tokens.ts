import { dsSkeletonPulse, dsTypoCaption, dsTypoSmall } from "@/lib/ui/design-system";

/** Durata animazione spinner — unico punto di modifica. */
export const LOADING_SPINNER_DURATION_MS = 1000;

/** Nome keyframe condiviso (app CSS + boot critical inline). */
export const CAB_SPINNER_SPIN_KEYFRAME_NAME = "cab-spinner-spin";

/** Ritardo prima di mostrare messaggio informativo contestuale. */
export const LOADING_DELAYED_MESSAGE_MS = 1000;

/** Durata fade skeleton/loading → contenuto (SSOT con --transition-content-duration). */
export const CONTENT_REVEAL_DURATION_MS = 150;

export const contentRevealClass = "cab-content-reveal";

export const loadingSpinnerSizeClass = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

export type LoadingSpinnerSize = keyof typeof loadingSpinnerSizeClass;

/** Geometria ring — invariata; no redesign in questo intervento. */
export const loadingSpinnerRingGeometryClass = "rounded-full border-2";

export const loadingSpinnerToneRingClass = {
  default:
    "border-[color:color-mix(in_srgb,var(--cab-border)_90%,transparent)] border-t-[var(--cab-primary)]",
  onPrimary: "border-[color:color-mix(in_srgb,#fff_25%,transparent)] border-t-white",
  muted: "border-[color:var(--cab-text-muted)] border-t-transparent opacity-70",
} as const;

export type LoadingSpinnerTone = keyof typeof loadingSpinnerToneRingClass;

/** Blocco @keyframes per boot critical inline (autonomo al primo paint). */
export const CAB_SPINNER_SPIN_KEYFRAMES_CSS = `@keyframes ${CAB_SPINNER_SPIN_KEYFRAME_NAME}{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;

/** Declaration animation inline-safe (no dipendenza da .cab-spinner-ring globale). */
export const cabSpinnerRingAnimationDecl = `animation:${CAB_SPINNER_SPIN_KEYFRAME_NAME} ${LOADING_SPINNER_DURATION_MS}ms linear infinite`;

export const loadingSpinnerRingClass = `${loadingSpinnerRingGeometryClass} cab-spinner-ring ${loadingSpinnerToneRingClass.default}`;

export const loadingSkeletonPulseClass = dsSkeletonPulse;

export const loadingMessageClass = `${dsTypoSmall} font-medium leading-snug text-[color:var(--cab-text-muted)]`;

export const loadingCaptionClass = `${dsTypoCaption} text-[color:var(--cab-text-muted)]`;

export const loadingProgressTrackClass =
  "h-1.5 w-full overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--cab-text-muted)_12%,var(--cab-surface-2))]";

export const loadingProgressFillClass =
  "h-full rounded-full bg-[color:var(--cab-primary)] transition-[width] duration-200 ease-out";

export const loadingProgressIndeterminateClass =
  "h-full w-1/3 animate-pulse rounded-full bg-[color:var(--cab-primary)]";
