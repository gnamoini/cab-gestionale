import assert from "node:assert/strict";
import {
  __getOverlayBackStackForTests,
  __resetOverlayBackStackForTests,
  handleOverlayBackPopState,
  registerOverlayBack,
} from "@/lib/ui/overlay-back-stack";

function withMockWindow(run: () => void): void {
  const g = globalThis as typeof globalThis & { window?: typeof globalThis.window };
  const prev = g.window;
  g.window = {
    history: {
      pushState: () => {},
      replaceState: () => {},
      state: null,
    },
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

withMockWindow(() => {
  __resetOverlayBackStackForTests();

  // T-OV layer insert: selector sopra modal
  registerOverlayBack(() => {}, "modal", { layer: "modal" });
  registerOverlayBack(() => {}, "selector", { layer: "selector" });
  const stack = __getOverlayBackStackForTests();
  assert.equal(stack.length, 2);
  assert.equal(stack[1]?.source, "selector");

  __resetOverlayBackStackForTests();

  // LIFO senza layer
  registerOverlayBack(() => {}, "a");
  registerOverlayBack(() => {}, "b");
  const stack2 = __getOverlayBackStackForTests();
  assert.equal(stack2[stack2.length - 1]?.source, "b");

  __resetOverlayBackStackForTests();

  // T-OV-01/02: modale + selector → back 1x chiude solo selector
  let modalClosed = 0;
  let selectorClosed = 0;
  registerOverlayBack(() => {
    modalClosed += 1;
  }, "modal", { layer: "modal" });
  registerOverlayBack(() => {
    selectorClosed += 1;
  }, "selector", { layer: "selector" });

  const first = handleOverlayBackPopState();
  assert.equal(first, true);
  assert.equal(selectorClosed, 1);
  assert.equal(modalClosed, 0);

  // T-OV-03: 2x back → modale chiude al secondo
  const second = handleOverlayBackPopState();
  assert.equal(second, true);
  assert.equal(modalClosed, 1);
  assert.equal(selectorClosed, 1);

  __resetOverlayBackStackForTests();

  // T-OV-04: dedup — stack vuoto, back no-op
  const noop = handleOverlayBackPopState();
  assert.equal(noop, false);

  __resetOverlayBackStackForTests();

  // T-OV-05: drawer + selector — selector chiude prima
  let drawerClosed = 0;
  selectorClosed = 0;
  registerOverlayBack(() => {
    drawerClosed += 1;
  }, "drawer", { layer: "drawer" });
  registerOverlayBack(() => {
    selectorClosed += 1;
  }, "selector", { layer: "selector" });
  handleOverlayBackPopState();
  assert.equal(selectorClosed, 1);
  assert.equal(drawerClosed, 0);
});

console.log("overlay-back-stack.test.ts OK");
