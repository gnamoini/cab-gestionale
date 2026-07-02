/**
 * Sidebar hover intent — timing SSOT e valori entro range UX flyout standard.
 */
import assert from "node:assert/strict";
import { SIDEBAR_HOVER_INTENT } from "./use-sidebar-collapsed";

assert.ok(SIDEBAR_HOVER_INTENT.openDelayMs >= 80 && SIDEBAR_HOVER_INTENT.openDelayMs <= 200);
assert.ok(SIDEBAR_HOVER_INTENT.closeDelayMs >= 120 && SIDEBAR_HOVER_INTENT.closeDelayMs <= 300);
assert.ok(SIDEBAR_HOVER_INTENT.reopenCooldownMs >= SIDEBAR_HOVER_INTENT.closeDelayMs);
assert.ok(
  SIDEBAR_HOVER_INTENT.minOpenForNoCooldownMs >= SIDEBAR_HOVER_INTENT.openDelayMs + SIDEBAR_HOVER_INTENT.closeDelayMs,
);
assert.ok(SIDEBAR_HOVER_INTENT.blurCollapseMs >= 0 && SIDEBAR_HOVER_INTENT.blurCollapseMs <= 120);
assert.ok(SIDEBAR_HOVER_INTENT.overlayCloseFocusSuppressMs >= 250);
assert.ok(SIDEBAR_HOVER_INTENT.overlayCloseReconcileMs >= 220);

console.log("use-sidebar-collapsed.test.ts OK");
