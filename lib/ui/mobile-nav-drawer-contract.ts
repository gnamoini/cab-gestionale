/**
 * SSOT costanti contratto drawer nav — mirror di docs/mobile-nav-drawer-contract.md
 */

export const NAV_DRAWER_OPEN_RATIO = 0.3;
export const NAV_DRAWER_VELOCITY_COMMIT_PX_MS = 0.45;
export const NAV_DRAWER_EDGE_ZONE_RATIO = 0.18;
export const NAV_DRAWER_EDGE_ZONE_MIN_PX = 20;
export const NAV_DRAWER_ANIMATION_MS = 240;
export const NAV_DRAWER_WATCHDOG_MS = 320;
export const NAV_DRAWER_RUBBER_BAND_MAX_PX = 24;
export const NAV_DRAWER_PANEL_ID = "cab-mobile-nav-drawer";

export type NavDrawerState =
  | "CLOSED"
  | "OPENING"
  | "OPEN"
  | "DRAGGING"
  | "SETTLING_OPEN"
  | "SETTLING_CLOSE"
  | "LOCKED";

export type NavDrawerEvent =
  | "OPEN_REQUEST"
  | "EDGE_DRAG_START"
  | "EDGE_DRAG_END_COMMIT"
  | "EDGE_DRAG_END_CANCEL"
  | "DISMISS_DRAG_START"
  | "DISMISS_DRAG_END_COMMIT"
  | "DISMISS_DRAG_END_CANCEL"
  | "ANIMATION_END"
  | "CLOSE_REQUEST"
  | "ROUTE_LOCK"
  | "POINTER_CANCEL"
  | "VISIBILITY_HIDDEN"
  | "RESIZE"
  | "FORCE_CLOSE"
  | "WATCHDOG_TIMEOUT";

/** Coppie (evento, stato) valide — usate dai test contract. */
export const NAV_DRAWER_CONTRACT_TRANSITIONS: ReadonlyArray<{
  event: NavDrawerEvent;
  from: NavDrawerState;
  to: NavDrawerState;
}> = [
  { event: "OPEN_REQUEST", from: "CLOSED", to: "OPENING" },
  { event: "ANIMATION_END", from: "OPENING", to: "OPEN" },
  { event: "EDGE_DRAG_START", from: "CLOSED", to: "DRAGGING" },
  { event: "EDGE_DRAG_END_COMMIT", from: "DRAGGING", to: "SETTLING_OPEN" },
  { event: "EDGE_DRAG_END_CANCEL", from: "DRAGGING", to: "SETTLING_CLOSE" },
  { event: "ANIMATION_END", from: "SETTLING_OPEN", to: "OPEN" },
  { event: "ANIMATION_END", from: "SETTLING_CLOSE", to: "CLOSED" },
  { event: "DISMISS_DRAG_START", from: "OPEN", to: "DRAGGING" },
  { event: "DISMISS_DRAG_END_COMMIT", from: "DRAGGING", to: "SETTLING_CLOSE" },
  { event: "DISMISS_DRAG_END_CANCEL", from: "DRAGGING", to: "OPEN" },
  { event: "CLOSE_REQUEST", from: "OPEN", to: "SETTLING_CLOSE" },
  { event: "CLOSE_REQUEST", from: "DRAGGING", to: "SETTLING_CLOSE" },
  { event: "ROUTE_LOCK", from: "OPEN", to: "LOCKED" },
  { event: "ANIMATION_END", from: "LOCKED", to: "CLOSED" },
  { event: "FORCE_CLOSE", from: "OPENING", to: "CLOSED" },
  { event: "FORCE_CLOSE", from: "OPEN", to: "CLOSED" },
  { event: "FORCE_CLOSE", from: "DRAGGING", to: "CLOSED" },
  { event: "POINTER_CANCEL", from: "DRAGGING", to: "SETTLING_CLOSE" },
  { event: "VISIBILITY_HIDDEN", from: "OPEN", to: "CLOSED" },
  { event: "WATCHDOG_TIMEOUT", from: "SETTLING_OPEN", to: "OPEN" },
  { event: "WATCHDOG_TIMEOUT", from: "SETTLING_CLOSE", to: "CLOSED" },
  { event: "WATCHDOG_TIMEOUT", from: "OPENING", to: "OPEN" },
];

export function resolveActivationZonePx(viewportWidth: number, safeAreaLeftPx = 0): number {
  return Math.max(
    NAV_DRAWER_EDGE_ZONE_MIN_PX + safeAreaLeftPx,
    viewportWidth * NAV_DRAWER_EDGE_ZONE_RATIO,
  );
}

export function shouldCommitByPosition(dragPx: number, panelWidth: number): boolean {
  return dragPx >= panelWidth * NAV_DRAWER_OPEN_RATIO;
}

export function shouldCommitByVelocity(velocityPxMs: number): boolean {
  return Math.abs(velocityPxMs) >= NAV_DRAWER_VELOCITY_COMMIT_PX_MS;
}

export function shouldCommitGesture(
  dragPx: number,
  panelWidth: number,
  velocityPxMs: number,
  direction: "open" | "close",
): boolean {
  const byPosition =
    direction === "open"
      ? shouldCommitByPosition(dragPx, panelWidth)
      : dragPx >= panelWidth * NAV_DRAWER_OPEN_RATIO;
  const byVelocity =
    direction === "open"
      ? velocityPxMs >= NAV_DRAWER_VELOCITY_COMMIT_PX_MS
      : velocityPxMs <= -NAV_DRAWER_VELOCITY_COMMIT_PX_MS;
  return byPosition || byVelocity;
}

/** ponytail: rubber-band oltre limite; upgrade = spring physics */
export function rubberBandDragX(raw: number, limit: number, maxOvershoot = NAV_DRAWER_RUBBER_BAND_MAX_PX): number {
  if (raw < 0) {
    const overshoot = -raw;
    if (overshoot <= limit) return raw;
    const beyond = overshoot - limit;
    return -(limit + Math.min(maxOvershoot, beyond * 0.35));
  }
  if (raw > limit) {
    const beyond = raw - limit;
    return limit + Math.min(maxOvershoot, beyond * 0.35);
  }
  return raw;
}

export function navDrawerAnimMs(reducedMotion = false): number {
  return reducedMotion ? 1 : NAV_DRAWER_ANIMATION_MS;
}
