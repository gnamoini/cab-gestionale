import assert from "node:assert/strict";
import {
  NAV_DRAWER_CONTRACT_TRANSITIONS,
  resolveActivationZonePx,
  shouldCommitByVelocity,
  shouldCommitGesture,
  rubberBandDragX,
} from "@/lib/ui/mobile-nav-drawer-contract";
import { navDrawerReducer, deriveDrawerFlags, NAV_DRAWER_INITIAL } from "@/lib/ui/mobile-nav-drawer-machine";

assert.equal(resolveActivationZonePx(390, 0), Math.max(20, 390 * 0.18));
assert.equal(resolveActivationZonePx(100, 0), 20);
assert.equal(shouldCommitByVelocity(0.5), true);
assert.equal(shouldCommitByVelocity(0.2), false);
assert.equal(shouldCommitGesture(100, 320, 0.1, "open"), true);
assert.equal(shouldCommitGesture(50, 320, 0.1, "open"), false);
assert.equal(shouldCommitGesture(50, 320, -0.5, "close"), true);
assert.ok(rubberBandDragX(350, 320) > 320);

let state = navDrawerReducer(NAV_DRAWER_INITIAL, "OPEN_REQUEST");
assert.equal(state.state, "OPENING");
assert.equal(state.mounted, true);

state = navDrawerReducer(state, "ANIMATION_END");
assert.equal(state.state, "OPEN");

state = navDrawerReducer(state, "CLOSE_REQUEST");
assert.equal(state.state, "SETTLING_CLOSE");

state = navDrawerReducer(state, "ANIMATION_END");
assert.equal(state.state, "CLOSED");
assert.equal(state.mounted, false);

state = navDrawerReducer(NAV_DRAWER_INITIAL, "EDGE_DRAG_START");
assert.equal(state.edgePreview, true);
state = navDrawerReducer(state, "EDGE_DRAG_END_COMMIT");
assert.equal(state.edgeSettledOpen, true);
state = navDrawerReducer(state, "ANIMATION_END");
assert.equal(state.state, "OPEN");

state = navDrawerReducer({ ...NAV_DRAWER_INITIAL, state: "OPEN", mounted: true }, "ROUTE_LOCK");
assert.equal(state.state, "LOCKED");
state = navDrawerReducer(state, "ANIMATION_END");
assert.equal(state.state, "CLOSED");

state = navDrawerReducer(
  { ...NAV_DRAWER_INITIAL, state: "DRAGGING", mounted: true, edgePreview: true },
  "POINTER_CANCEL",
);
assert.equal(state.state, "SETTLING_CLOSE");

const flags = deriveDrawerFlags({ ...NAV_DRAWER_INITIAL, state: "OPEN", mounted: true });
assert.equal(flags.isActive, true);
assert.equal(flags.canDismiss, true);

assert.ok(NAV_DRAWER_CONTRACT_TRANSITIONS.length >= 10);

console.log("mobile-nav-drawer-machine.test.ts ok");
