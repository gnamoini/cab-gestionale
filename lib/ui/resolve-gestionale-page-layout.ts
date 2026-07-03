export type GestionalePageLayoutSsrHint = "unknown" | "measured";

export type LayoutDecision = "mobile" | "desktop";

export type GestionaleListLayoutTier = "xl" | "lg" | "md";

export const GESTIONALE_LIST_MIN_VIEWPORT_XL = 1280;
export const GESTIONALE_LIST_MIN_CONTAINER_XL = 1024;

const TIER_THRESHOLDS: Record<GestionaleListLayoutTier, { minViewport: number; minContainer: number }> = {
  xl: { minViewport: GESTIONALE_LIST_MIN_VIEWPORT_XL, minContainer: GESTIONALE_LIST_MIN_CONTAINER_XL },
  lg: { minViewport: 1024, minContainer: 896 },
  md: { minViewport: 768, minContainer: 640 },
};

export type GestionalePageLayoutInput = {
  viewportWidth: number;
  containerWidth: number;
  shellContentWidth: number;
  ssrHint: GestionalePageLayoutSsrHint;
  listTier?: GestionaleListLayoutTier;
};

export function gestionalePageLayoutSsrHint(shellContentWidth: number): GestionalePageLayoutSsrHint {
  return shellContentWidth > 0 ? "measured" : "unknown";
}

/** Unica source of truth layout lista — RULES R1–R5 (tier xl default). */
export function resolveGestionalePageLayout(input: GestionalePageLayoutInput): LayoutDecision {
  // R1
  if (input.shellContentWidth === 0) return "mobile";
  // R2
  if (input.ssrHint === "unknown") return "mobile";

  const tier = input.listTier ?? "xl";
  const { minViewport, minContainer } = TIER_THRESHOLDS[tier];

  // R3
  if (input.viewportWidth < minViewport) return "mobile";
  // R4
  if (input.containerWidth >= minContainer && input.viewportWidth >= minViewport) return "desktop";
  // R5
  return "mobile";
}
