/** SSOT pull-to-refresh mobile — soglie gesture e rubber-band. */

export const PTR_COMMIT_PX = 72;
export const PTR_MAX_PULL_PX = 120;
export const PTR_VERTICAL_DOMINANCE_RATIO = 1.2;
export const PTR_RUBBER_BAND_MAX_PX = 24;
export const PTR_SCROLL_TOP_EPSILON_PX = 1;

export const PTR_REFRESH_EVENT = "cab:pull-to-refresh" as const;

export const CAB_SCROLLPORT_ATTR = "data-cab-scrollport";

export function isElementScrollableY(el: HTMLElement): boolean {
  if (typeof window === "undefined") return false;
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  const overflow = style.overflow;
  const allowsScroll =
    overflowY === "auto" ||
    overflowY === "scroll" ||
    overflowY === "overlay" ||
    overflow === "auto" ||
    overflow === "scroll";
  return allowsScroll && el.scrollHeight > el.clientHeight + 1;
}

/** Risolve lo scrollport attivo per PTR: contratto DOM → overflow → main. */
export function resolvePullScrollport(target: Element, main: HTMLElement): HTMLElement {
  const marked = target.closest(`[${CAB_SCROLLPORT_ATTR}]`);
  if (marked != null && main.contains(marked)) {
    return marked as HTMLElement;
  }

  let node: Element | null = target;
  while (node != null && main.contains(node)) {
    if (node instanceof HTMLElement && isElementScrollableY(node)) return node;
    if (node === main) break;
    node = node.parentElement;
  }

  return main;
}

export type PullToRefreshPhase = "idle" | "pulling" | "refreshing";

/** ponytail: rubber-band oltre limite; upgrade = spring physics */
export function rubberBandPullY(rawPullPx: number, maxPull = PTR_MAX_PULL_PX): number {
  const pull = Math.max(0, rawPullPx);
  if (pull <= maxPull) return pull;
  const beyond = pull - maxPull;
  return maxPull + Math.min(PTR_RUBBER_BAND_MAX_PX, beyond * 0.35);
}

export function isVerticalPullGesture(deltaX: number, deltaY: number): boolean {
  if (deltaY <= 0) return false;
  return deltaY >= Math.abs(deltaX) * PTR_VERTICAL_DOMINANCE_RATIO;
}

export function shouldCommitPullToRefresh(pullPx: number): boolean {
  return pullPx >= PTR_COMMIT_PX;
}

export function pullProgress(pullPx: number): number {
  return Math.max(0, Math.min(1, pullPx / PTR_COMMIT_PX));
}

export function isScrollAtTop(scrollTop: number): boolean {
  return scrollTop <= PTR_SCROLL_TOP_EPSILON_PX;
}
