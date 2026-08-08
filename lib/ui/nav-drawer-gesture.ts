import {
  NAV_DRAWER_DIRECTION_RATIO,
  NAV_DRAWER_GESTURE_START_PX,
  NAV_DRAWER_TAP_THRESHOLD_PX,
  resolveActivationZonePx,
  type ResolveActivationZoneOpts,
} from "@/lib/ui/mobile-nav-drawer-contract";
import { isSwipeNavGestureBlockedTarget } from "@/lib/ui/gesture-arbitration";

export type GestureIntent = "horizontal" | "vertical" | "pending";

export type GestureDirection = "open" | "close";

/** clientX è in viewport coords; zonePx include safe-area se fornita. */
export function isInEdgeZone(clientX: number, zonePx: number): boolean {
  return clientX <= zonePx;
}

export function resolveEdgeZonePx(opts: ResolveActivationZoneOpts = {}): number {
  return resolveActivationZonePx(opts);
}

/** Legge --cab-safe-left (env safe-area-inset-left) dal root — una sola fonte. */
export function readSafeAreaLeftPx(): number {
  if (typeof document === "undefined") return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--cab-safe-left").trim();
  const px = parseFloat(raw);
  return Number.isFinite(px) ? px : 0;
}

export function classifyGestureIntent(
  dx: number,
  dy: number,
  startPx = NAV_DRAWER_GESTURE_START_PX,
  ratio = NAV_DRAWER_DIRECTION_RATIO,
): GestureIntent {
  if (Math.abs(dx) < startPx && Math.abs(dy) < startPx) return "pending";
  if (Math.abs(dy) > Math.abs(dx)) return "vertical";
  if (Math.abs(dx) > Math.abs(dy) * ratio) return "horizontal";
  return "pending";
}

export function isTapGesture(dx: number, dy: number, threshold = NAV_DRAWER_TAP_THRESHOLD_PX): boolean {
  return Math.hypot(dx, dy) < threshold;
}

export function shouldActivateHorizontalDrag(
  direction: GestureDirection,
  inEdgeZone: boolean,
  dx: number,
  dy: number,
  startPx = NAV_DRAWER_GESTURE_START_PX,
  ratio = NAV_DRAWER_DIRECTION_RATIO,
): boolean {
  const intent = classifyGestureIntent(dx, dy, startPx, ratio);
  if (intent !== "horizontal") return false;
  if (direction === "open") {
    if (dx <= startPx) return false;
    if (inEdgeZone) return true;
    return dx > startPx;
  }
  return dx < -startPx;
}

export function panelTransformOpen(dragX: number, panelWidth: number): string {
  return `translate3d(${-panelWidth + dragX}px, 0, 0)`;
}

export function panelTransformClose(dragX: number): string {
  return `translate3d(${dragX}px, 0, 0)`;
}

export function backdropOpacityForOpen(dragX: number, panelWidth: number): number {
  return Math.max(0, Math.min(1, dragX / panelWidth));
}

export function backdropOpacityForClose(dragX: number, panelWidth: number): number {
  return Math.max(0, Math.min(1, 1 + dragX / panelWidth));
}

export function clampOpenDragX(rawDeltaX: number, panelWidth: number): number {
  return Math.max(0, Math.min(panelWidth, rawDeltaX));
}

export function clampCloseDragX(deltaX: number, panelWidth: number): number {
  return Math.min(0, Math.max(-panelWidth, deltaX));
}

export function peakDragX(current: number, peak: number): number {
  return Math.max(current, peak);
}

export function peakVelocity(current: number, peak: number): number {
  return Math.max(current, peak);
}

export function isMultiPointerActive(pointerCount: number): boolean {
  return pointerCount > 1;
}

const INTERACTIVE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);

export function shouldBlockGestureTarget(el: Element | null): boolean {
  if (el == null || typeof HTMLElement === "undefined") return false;
  let node: Element | null = el;
  while (node instanceof HTMLElement) {
    const tag = node.tagName;
    if (INTERACTIVE_TAGS.has(tag)) return true;
    if (node instanceof HTMLLabelElement && node.control != null) return true;
    if (node.getAttribute("role") === "switch" || node.getAttribute("role") === "slider") return true;
    if (node.isContentEditable) return true;
    node = node.parentElement;
  }
  return isSwipeNavGestureBlockedTarget(el);
}
