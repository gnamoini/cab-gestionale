import assert from "node:assert/strict";
import { canRenderFromBarrier, deriveBarrierState } from "./client-portal-derive-barrier";

assert.equal(
  deriveBarrierState({
    accessAllowed: true,
    shellContentWidth: 0,
    l0Status: "idle",
    l1Status: "idle",
  }),
  "INIT",
);

assert.equal(
  deriveBarrierState({
    accessAllowed: true,
    shellContentWidth: 0,
    l0Status: "loading",
    l1Status: "idle",
  }),
  "LAYOUT_PENDING",
);

assert.equal(
  deriveBarrierState({
    accessAllowed: true,
    shellContentWidth: 1440,
    l0Status: "loading",
    l1Status: "idle",
  }),
  "DATA_L0_LOADING",
);

assert.equal(
  deriveBarrierState({
    accessAllowed: true,
    shellContentWidth: 1440,
    l0Status: "success",
    l1Status: "loading",
  }),
  "READY_PARTIAL",
);

assert.equal(
  deriveBarrierState({
    accessAllowed: true,
    shellContentWidth: 1440,
    l0Status: "success",
    l1Status: "success",
  }),
  "READY_FULL",
);

assert.equal(
  deriveBarrierState({
    accessAllowed: false,
    shellContentWidth: 1440,
    l0Status: "success",
    l1Status: "success",
  }),
  "ERROR",
);

assert.equal(canRenderFromBarrier("READY_PARTIAL"), true);
assert.equal(canRenderFromBarrier("DATA_L0_LOADING"), false);

console.log("client-portal-derive-barrier.test.ts OK");
