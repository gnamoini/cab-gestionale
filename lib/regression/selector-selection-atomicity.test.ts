import assert from "node:assert/strict";
import {
  __resetSelectOptionAtomicForTests,
  runSelectOptionAtomic,
} from "@/lib/selector-core/select-option-atomic";

__resetSelectOptionAtomicForTests();

// T-SEL-01: onChange before closeOverlaySync
{
  const order: string[] = [];
  runSelectOptionAtomic({
    cancelPendingBlur: () => order.push("cancel"),
    onChange: () => order.push("onChange"),
    nextValue: "x",
    closeOverlaySync: () => order.push("close"),
    resetInteractionState: () => order.push("reset"),
  });
  assert.deepEqual(order, ["cancel", "onChange", "close", "reset"]);
}

__resetSelectOptionAtomicForTests();

// T-SEL-02: nested select ignored
{
  let changeCount = 0;
  runSelectOptionAtomic({
    cancelPendingBlur: () => {},
    onChange: () => {
      changeCount += 1;
      runSelectOptionAtomic({
        cancelPendingBlur: () => {},
        onChange: () => {
          changeCount += 1;
        },
        nextValue: "b",
        closeOverlaySync: () => {},
        resetInteractionState: () => {},
      });
    },
    nextValue: "a",
    closeOverlaySync: () => {},
    resetInteractionState: () => {},
  });
  assert.equal(changeCount, 1);
}

__resetSelectOptionAtomicForTests();

// T-SEL-03: flush after onChange
{
  const order: string[] = [];
  runSelectOptionAtomic({
    cancelPendingBlur: () => {},
    onChange: () => order.push("onChange"),
    nextValue: "v",
    flushCombobox: () => order.push("flush"),
    closeOverlaySync: () => {},
    resetInteractionState: () => {},
  });
  assert.deepEqual(order, ["onChange", "flush"]);
}

__resetSelectOptionAtomicForTests();

// recordRecent before close
{
  const order: string[] = [];
  runSelectOptionAtomic({
    cancelPendingBlur: () => {},
    onChange: () => order.push("onChange"),
    nextValue: "v",
    recordRecent: () => order.push("recent"),
    closeOverlaySync: () => order.push("close"),
    resetInteractionState: () => {},
  });
  assert.deepEqual(order, ["onChange", "recent", "close"]);
}

console.log("selector-selection-atomicity.test.ts OK");
