/** SSOT priorità surface loading — mutua esclusione globale. */

export type LoadingSurface = "overlay" | "skeleton" | "banner";

export const SURFACE_PRIORITY: Record<LoadingSurface, number> = {
  overlay: 100,
  skeleton: 60,
  banner: 40,
};

export type LoadingClaimRecord = {
  surface: LoadingSurface;
  id: string;
  message?: string;
};

export function claimKey(surface: LoadingSurface, id: string): string {
  return `${surface}:${id}`;
}

/** Surface vincente = priorità massima tra quelle con almeno un claim attivo. */
export function resolveWinningSurface(claims: Iterable<LoadingClaimRecord>): LoadingSurface | null {
  const activeSurfaces = new Set<LoadingSurface>();
  for (const claim of claims) {
    activeSurfaces.add(claim.surface);
  }
  if (activeSurfaces.size === 0) return null;

  let winner: LoadingSurface | null = null;
  let maxPriority = -1;
  for (const surface of activeSurfaces) {
    const priority = SURFACE_PRIORITY[surface];
    if (priority > maxPriority) {
      maxPriority = priority;
      winner = surface;
    }
  }
  return winner;
}

/** Messaggio overlay: ultimo claim overlay registrato (ordine inserimento). */
export function resolveOverlayMessage(
  claims: Iterable<LoadingClaimRecord>,
  fallback: string,
): string {
  let message = fallback;
  for (const claim of claims) {
    if (claim.surface === "overlay" && claim.message?.trim()) {
      message = claim.message.trim();
    }
  }
  return message;
}

export function isSurfaceActive(winning: LoadingSurface | null, surface: LoadingSurface): boolean {
  return winning === surface;
}

export function isClaimWinning(
  winning: LoadingSurface | null,
  claims: Map<string, LoadingClaimRecord>,
  surface: LoadingSurface,
  id: string,
): boolean {
  if (winning !== surface) return false;
  return claims.has(claimKey(surface, id));
}
