import assert from "node:assert/strict";
import { navDrawerReducer, NAV_DRAWER_INITIAL } from "@/lib/ui/mobile-nav-drawer-machine";

let cycles = 0;
let state = NAV_DRAWER_INITIAL;
for (let i = 0; i < 500; i++) {
  state = navDrawerReducer(state, "OPEN_REQUEST");
  state = navDrawerReducer(state, "ANIMATION_END");
  state = navDrawerReducer(state, "CLOSE_REQUEST");
  state = navDrawerReducer(state, "ANIMATION_END");
  cycles += 1;
}
assert.equal(cycles, 500);
assert.equal(state.state, "CLOSED");
assert.equal(state.mounted, false);

console.log("mobile-nav-drawer-memory.test.ts ok");
