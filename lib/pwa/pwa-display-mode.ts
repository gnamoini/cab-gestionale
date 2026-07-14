export type PwaDisplayMode = "browser" | "standalone" | "minimal-ui" | "fullscreen";

export const PWA_DISPLAY_MODE_STANDALONE_QUERY = "(display-mode: standalone)" as const;
export const PWA_DISPLAY_MODE_FULLSCREEN_QUERY = "(display-mode: fullscreen)" as const;
export const PWA_DISPLAY_MODE_MINIMAL_UI_QUERY = "(display-mode: minimal-ui)" as const;

type MatchMediaFn = (query: string) => { matches: boolean };

function matchesQuery(matchMedia: MatchMediaFn | undefined, query: string): boolean {
  if (!matchMedia) return false;
  try {
    return matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** SSOT display mode — matchMedia prima, navigator.standalone solo fallback iOS. */
export function resolvePwaDisplayMode(input: {
  matchMedia?: MatchMediaFn;
  navigatorStandalone?: boolean;
}): PwaDisplayMode {
  if (matchesQuery(input.matchMedia, PWA_DISPLAY_MODE_STANDALONE_QUERY)) return "standalone";
  if (matchesQuery(input.matchMedia, PWA_DISPLAY_MODE_FULLSCREEN_QUERY)) return "fullscreen";
  if (matchesQuery(input.matchMedia, PWA_DISPLAY_MODE_MINIMAL_UI_QUERY)) return "minimal-ui";
  if (input.navigatorStandalone === true) return "standalone";
  return "browser";
}

export function isPwaStandaloneMode(mode: PwaDisplayMode): boolean {
  return mode === "standalone" || mode === "fullscreen" || mode === "minimal-ui";
}
