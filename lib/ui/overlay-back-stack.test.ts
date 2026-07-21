import assert from "node:assert/strict";
import {
  __getOverlayBackStackForTests,
  __getSuppressedPopCountForTests,
  __resetOverlayBackStackForTests,
  handleOverlayBackPopState,
  isOwnedOverlayHistoryEntry,
  OverlayLayerPriority,
  registerOverlayBack,
} from "@/lib/ui/overlay-back-stack";

type MockHistory = {
  stack: unknown[];
  index: number;
  pushState: (state: unknown, _title: string, _url: string) => void;
  replaceState: (state: unknown, _title: string, _url: string) => void;
  back: () => void;
  readonly state: unknown;
};

function createMockHistory(initial: unknown = null): MockHistory {
  const hist: MockHistory = {
    stack: [initial],
    index: 0,
    pushState(state) {
      hist.stack = hist.stack.slice(0, hist.index + 1);
      hist.stack.push(state);
      hist.index = hist.stack.length - 1;
    },
    replaceState(state) {
      hist.stack[hist.index] = state;
    },
    back() {
      if (hist.index > 0) hist.index -= 1;
    },
    get state() {
      return hist.stack[hist.index] ?? null;
    },
  };
  return hist;
}

function withMockWindow(run: (history: MockHistory) => void): void {
  const g = globalThis as typeof globalThis & { window?: typeof globalThis.window };
  const prev = g.window;
  const history = createMockHistory(null);
  g.window = {
    history,
    location: { href: "http://localhost/page-a" },
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as typeof globalThis.window;
  try {
    run(history);
  } finally {
    g.window = prev;
  }
}

withMockWindow((history) => {
  __resetOverlayBackStackForTests();

  // T-OV layer priority: selector sopra modal
  registerOverlayBack(() => {}, "modal", { layer: "modal", priority: OverlayLayerPriority.modal });
  registerOverlayBack(() => {}, "selector", { layer: "selector", priority: OverlayLayerPriority.selector });
  const stack = __getOverlayBackStackForTests();
  assert.equal(stack.length, 2);
  assert.equal(stack[1]?.source, "selector");

  __resetOverlayBackStackForTests();
  history.stack = [null];
  history.index = 0;

  // T-OV-01/02: modale + selector → back 1x chiude solo selector
  let modalClosed = 0;
  let selectorClosed = 0;
  registerOverlayBack(() => {
    modalClosed += 1;
  }, "modal", { layer: "modal", priority: OverlayLayerPriority.modal });
  registerOverlayBack(() => {
    selectorClosed += 1;
  }, "selector", { layer: "selector", priority: OverlayLayerPriority.selector });

  const first = handleOverlayBackPopState();
  assert.equal(first, true);
  assert.equal(selectorClosed, 1);
  assert.equal(modalClosed, 0);

  const second = handleOverlayBackPopState();
  assert.equal(second, true);
  assert.equal(modalClosed, 1);

  __resetOverlayBackStackForTests();
  history.stack = [null];
  history.index = 0;

  const noop = handleOverlayBackPopState();
  assert.equal(noop, false);

  __resetOverlayBackStackForTests();
  history.stack = [null];
  history.index = 0;

  // T-OV-05: drawer + selector
  let drawerClosed = 0;
  selectorClosed = 0;
  registerOverlayBack(() => {
    drawerClosed += 1;
  }, "drawer", { layer: "drawer", priority: OverlayLayerPriority.drawer });
  registerOverlayBack(() => {
    selectorClosed += 1;
  }, "selector", { layer: "selector", priority: OverlayLayerPriority.selector });
  handleOverlayBackPopState();
  assert.equal(selectorClosed, 1);
  assert.equal(drawerClosed, 0);

  __resetOverlayBackStackForTests();
  history.stack = [null];
  history.index = 0;

  // Ownership: owned entry → history.back on programmatic close
  registerOverlayBack(() => {}, "a", { layer: "modal", priority: OverlayLayerPriority.modal });
  const cleanupB = registerOverlayBack(() => {}, "b", { layer: "modal", priority: OverlayLayerPriority.modal });
  const topEntry = __getOverlayBackStackForTests().find((e) => e.source === "b");
  assert.ok(topEntry);
  assert.equal(isOwnedOverlayHistoryEntry(history.state, topEntry!.id), true);
  cleanupB();
  assert.equal(__getSuppressedPopCountForTests(), 1);
  assert.equal(handleOverlayBackPopState(), true);
  assert.equal(__getSuppressedPopCountForTests(), 0);

  __resetOverlayBackStackForTests();
  history.stack = [null];
  history.index = 0;

  // Unowned history top → replaceState fallback (no suppress)
  registerOverlayBack(() => {}, "solo", { layer: "modal", priority: OverlayLayerPriority.modal });
  registerOverlayBack(() => {}, "top", {
    layer: "modal",
    priority: OverlayLayerPriority.modal,
  });
  const top2Entry = __getOverlayBackStackForTests().find((e) => e.source === "top");
  assert.ok(top2Entry);
  history.replaceState({ cabOverlay: 99 }, "", "");
  assert.equal(isOwnedOverlayHistoryEntry(history.state, top2Entry!.id), false);
  const cleanupUnowned = registerOverlayBack(() => {}, "top2", {
    layer: "modal",
    priority: OverlayLayerPriority.modal,
  });
  // top2 is back target; corrupt history before close
  history.replaceState({ cabOverlay: 99 }, "", "");
  cleanupUnowned();
  assert.equal(__getSuppressedPopCountForTests(), 0);

  __resetOverlayBackStackForTests();
  history.stack = [null];
  history.index = 0;

  // Layer priority: confirm sopra modal
  let confirmClosed = 0;
  modalClosed = 0;
  registerOverlayBack(() => {
    modalClosed += 1;
  }, "modal", { layer: "modal", priority: OverlayLayerPriority.modal });
  registerOverlayBack(() => {
    confirmClosed += 1;
  }, "confirm", { layer: "confirm", priority: OverlayLayerPriority.confirm });
  handleOverlayBackPopState();
  assert.equal(confirmClosed, 1);
  assert.equal(modalClosed, 0);
});

console.log("overlay-back-stack.test.ts OK");
