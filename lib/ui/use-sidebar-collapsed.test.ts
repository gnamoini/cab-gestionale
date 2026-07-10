/**
 * Sidebar hover intent — timing SSOT e valori entro range UX flyout standard.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GESTIONALE_OVERLAY_OPENED_EVENT,
  dispatchGestionaleOverlayOpened,
  isGestionaleOverlayActive,
  isPointerInViewport,
  SIDEBAR_HOVER_INTENT,
} from "./use-sidebar-collapsed";

const sidebarCollapsedSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/ui/use-sidebar-collapsed.ts"),
  "utf8",
);

assert.match(sidebarCollapsedSrc, /GESTIONALE_OVERLAY_OPENED_EVENT/);
assert.match(sidebarCollapsedSrc, /dispatchGestionaleOverlayOpened/);
assert.match(sidebarCollapsedSrc, /isGestionaleOverlayActive/);
assert.equal(GESTIONALE_OVERLAY_OPENED_EVENT, "cab:gestionale-overlay-opened");
assert.equal(typeof dispatchGestionaleOverlayOpened, "function");
assert.equal(isGestionaleOverlayActive(), false);

assert.ok(SIDEBAR_HOVER_INTENT.openDelayMs >= 80 && SIDEBAR_HOVER_INTENT.openDelayMs <= 200);
assert.ok(SIDEBAR_HOVER_INTENT.closeDelayMs >= 120 && SIDEBAR_HOVER_INTENT.closeDelayMs <= 300);
assert.ok(SIDEBAR_HOVER_INTENT.reopenCooldownMs >= SIDEBAR_HOVER_INTENT.closeDelayMs);
assert.ok(
  SIDEBAR_HOVER_INTENT.minOpenForNoCooldownMs >= SIDEBAR_HOVER_INTENT.openDelayMs + SIDEBAR_HOVER_INTENT.closeDelayMs,
);
assert.ok(SIDEBAR_HOVER_INTENT.blurCollapseMs >= 0 && SIDEBAR_HOVER_INTENT.blurCollapseMs <= 120);
assert.ok(SIDEBAR_HOVER_INTENT.overlayCloseFocusSuppressMs >= 250);
assert.ok(SIDEBAR_HOVER_INTENT.overlayCloseReconcileMs >= 220);

if (typeof window !== "undefined") {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  assert.equal(isPointerInViewport({ x: -1, y: 40 }), false);
  assert.equal(isPointerInViewport({ x: 0, y: 40 }), true);
  assert.equal(isPointerInViewport({ x: viewportW, y: 40 }), false);
  assert.equal(isPointerInViewport({ x: 40, y: viewportH }), false);
}

console.log("use-sidebar-collapsed.test.ts OK");
