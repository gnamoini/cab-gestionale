import type { NavDrawerState } from "@/lib/ui/mobile-nav-drawer-contract";
import { NAV_DRAWER_PANEL_ID, resolveActivationZonePx } from "@/lib/ui/mobile-nav-drawer-contract";

export type GestureClaimant =
  | "modal"
  | "navDrawer"
  | "filterDrawer"
  | "draggable"
  | "horizontalScroll"
  | "pageScroll";

export type GestureContext = {
  target: Element;
  clientX: number;
  clientY: number;
  drawerState: NavDrawerState;
  overlayActive: boolean;
  keyboardOpen: boolean;
  viewportWidth: number;
  safeAreaLeftPx?: number;
};

function isEditableFocused(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function hasExplicitGestureOptOut(el: Element | null): boolean {
  if (el == null) return false;
  let node: Element | null = el;
  while (node != null) {
    if (node.hasAttribute("data-cab-swipe-nav-ignore")) return true;
    if (node.hasAttribute("data-cab-draggable")) return true;
    node = node.parentElement;
  }
  return false;
}

function isSwipeNavGestureBlockedTarget(el: Element | null): boolean {
  if (el == null || typeof HTMLElement === "undefined") return false;
  let node: Element | null = el;
  while (node instanceof HTMLElement) {
    if (node.dataset.cabSwipeNavIgnore !== undefined) return true;
    if (node.dataset.cabDraggable !== undefined) return true;
    const style = getComputedStyle(node);
    const touchAction = style.touchAction;
    if (touchAction.includes("pan-x") && !touchAction.includes("pan-y")) return true;
    const overflowX = style.overflowX;
    if (
      (overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay") &&
      node.scrollWidth > node.clientWidth + 1
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function isInteractiveGestureTarget(el: Element | null): boolean {
  if (el == null) return false;
  let node: Element | null = el;
  while (node != null) {
    const tag = node.tagName.toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return true;
    if (tag === "LABEL" && "control" in node && (node as HTMLLabelElement).control != null) return true;
    if (node.getAttribute("role") === "switch" || node.getAttribute("role") === "slider") return true;
    if ("isContentEditable" in node && (node as HTMLElement).isContentEditable) return true;
    node = node.parentElement;
  }
  return false;
}

function isFilterDrawerOpen(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector('.cab-drawer-panel[data-state="open"]') != null;
}

/** Priority stack: modal > navDrawer > filterDrawer > draggable > horizontalScroll > pageScroll */
export function resolveGestureOwner(ctx: GestureContext): GestureClaimant {
  if (ctx.overlayActive) return "modal";
  if (ctx.drawerState === "OPEN" || ctx.drawerState === "DRAGGING") return "navDrawer";
  if (isFilterDrawerOpen()) return "filterDrawer";
  if (isSwipeNavGestureBlockedTarget(ctx.target)) {
    if (ctx.target.closest("[data-cab-draggable]")) return "draggable";
    return "horizontalScroll";
  }
  return "pageScroll";
}

export function shouldNavDrawerClaimEdgeSwipe(ctx: GestureContext): boolean {
  if (ctx.drawerState !== "CLOSED") return false;
  if (ctx.overlayActive) return false;
  if (ctx.keyboardOpen || isEditableFocused()) return false;

  const zone = resolveActivationZonePx({ safeAreaLeftPx: ctx.safeAreaLeftPx ?? 0 });
  if (ctx.clientX > zone) return false;

  return !hasExplicitGestureOptOut(ctx.target);
}

/** Dev/debug: reason edge swipe was rejected, or null if claim allowed. */
export function getNavDrawerEdgeSwipeBlockReason(ctx: GestureContext): string | null {
  if (shouldNavDrawerClaimEdgeSwipe(ctx)) return null;
  if (ctx.drawerState !== "CLOSED") return "drawer_not_closed";
  if (ctx.overlayActive) return "overlay_active";
  if (ctx.keyboardOpen || isEditableFocused()) return "input_focused";
  const zone = resolveActivationZonePx({ safeAreaLeftPx: ctx.safeAreaLeftPx ?? 0 });
  if (ctx.clientX > zone) return "outside_edge_zone";
  if (hasExplicitGestureOptOut(ctx.target)) return "explicit_opt_out";
  if (isSwipeNavGestureBlockedTarget(ctx.target)) return "horizontal_scroll";
  return "gesture_owner";
}

export function shouldNavDrawerClaimDismiss(ctx: GestureContext): boolean {
  if (ctx.drawerState !== "OPEN" && ctx.drawerState !== "DRAGGING") return false;
  if (ctx.overlayActive) return false;
  if (!ctx.target.closest(`#${NAV_DRAWER_PANEL_ID}`)) return false;
  if (isInteractiveGestureTarget(ctx.target)) return false;
  if (hasExplicitGestureOptOut(ctx.target)) return false;
  if (isSwipeNavGestureBlockedTarget(ctx.target)) return false;
  return resolveGestureOwner(ctx) === "navDrawer";
}

export { hasExplicitGestureOptOut, isSwipeNavGestureBlockedTarget };
