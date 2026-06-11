import assert from "node:assert/strict";
import {
  __resetSelectOptionAtomicForTests,
  isSelectionInFlight,
  runSelectOptionAtomic,
  shouldIgnoreBlurDuringSelection,
} from "@/lib/selector-core/select-option-atomic";
import {
  __resetOverlayBackStackForTests,
  registerOverlayBack,
} from "@/lib/ui/overlay-back-stack";

function mockWindow(run: () => void): void {
  const g = globalThis as typeof globalThis & { window?: typeof globalThis.window };
  const prev = g.window;
  g.window = {
    history: { pushState: () => {}, replaceState: () => {}, state: null },
    location: { href: "http://localhost/" },
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as typeof globalThis.window;
  try {
    run();
  } finally {
    g.window = prev;
  }
}

function simulateBlurRace(opts: {
  cancelOnSelect: boolean;
  selectValue: string;
}): { onChangeCount: number; blurCommitCount: number } {
  let blurTimer: ReturnType<typeof setTimeout> | null = null;
  let onChangeCount = 0;
  let blurCommitCount = 0;

  const cancelPendingBlur = () => {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = null;
  };

  const commitBlur = () => {
    if (shouldIgnoreBlurDuringSelection()) return;
    blurCommitCount += 1;
    onChangeCount += 1;
  };

  blurTimer = setTimeout(commitBlur, 120);

  if (opts.cancelOnSelect) cancelPendingBlur();

  runSelectOptionAtomic({
    cancelPendingBlur,
    onChange: () => {
      onChangeCount += 1;
    },
    nextValue: opts.selectValue,
    closeOverlaySync: () => {},
    resetInteractionState: () => {},
  });

  return { onChangeCount, blurCommitCount };
}

// T-RACE-01: pointerdown + blur → solo commit pointer
__resetSelectOptionAtomicForTests();
{
  const { onChangeCount } = simulateBlurRace({ cancelOnSelect: true, selectValue: "a" });
  assert.equal(onChangeCount, 1);
}

// T-RACE-02: onChange before closeSync; overlay back non interrompe commit
__resetSelectOptionAtomicForTests();
{
  const order: string[] = [];
  mockWindow(() => {
    __resetOverlayBackStackForTests();
    registerOverlayBack(() => order.push("overlayBack"), "selector", { layer: "selector" });

    runSelectOptionAtomic({
      cancelPendingBlur: () => {},
      onChange: () => order.push("onChange"),
      nextValue: "opt",
      closeOverlaySync: () => order.push("closeSync"),
      resetInteractionState: () => {},
    });
  });
  assert.deepEqual(order, ["onChange", "closeSync"]);
  assert.equal(order.includes("overlayBack"), false);
}

// T-RACE-03: double pointer → single commit
__resetSelectOptionAtomicForTests();
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
        nextValue: "second",
        closeOverlaySync: () => {},
        resetInteractionState: () => {},
      });
    },
    nextValue: "first",
    closeOverlaySync: () => {},
    resetInteractionState: () => {},
  });
  assert.equal(changeCount, 1);
}

// T-RACE-04: blur stale → no commit when timer cleared
__resetSelectOptionAtomicForTests();
{
  const { onChangeCount, blurCommitCount } = simulateBlurRace({
    cancelOnSelect: true,
    selectValue: "x",
  });
  assert.equal(onChangeCount, 1);
  assert.equal(blurCommitCount, 0);
}

// T-RACE-05: back during selection in-flight — no double close
__resetSelectOptionAtomicForTests();
{
  let closeCount = 0;
  runSelectOptionAtomic({
    cancelPendingBlur: () => {},
    onChange: () => {
      assert.equal(isSelectionInFlight(), true);
      runSelectOptionAtomic({
        cancelPendingBlur: () => {},
        onChange: () => {
          closeCount += 1;
        },
        nextValue: "stale",
        closeOverlaySync: () => closeCount += 1,
        resetInteractionState: () => {},
      });
    },
    nextValue: "ok",
    closeOverlaySync: () => closeCount += 1,
    resetInteractionState: () => {},
  });
  assert.equal(closeCount, 1);
}

console.log("selector-concurrency-race.test.ts OK");
