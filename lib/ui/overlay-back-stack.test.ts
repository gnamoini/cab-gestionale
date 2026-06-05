import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  __getOverlayBackStackForTests,
  __resetOverlayBackStackForTests,
  __setSuppressNextPopForTests,
  attachOverlayBackPopStateListener,
  CAB_OVERLAY_HISTORY_KEY,
  getOverlayBackStackDepth,
  handleOverlayBackPopState,
  healOverlayBackStack,
  registerOverlayBack,
  resetOverlayBackStack,
} from "@/lib/ui/overlay-back-stack";

const root = process.cwd();

type HistoryEntry = { state: unknown; url: string };

function createHistoryMock() {
  const stack: HistoryEntry[] = [{ state: null, url: "http://localhost/page" }];
  let index = 0;
  const backHandlers: Array<() => void> = [];

  const history = {
    get state() {
      return stack[index]?.state ?? null;
    },
    get length() {
      return stack.length;
    },
    pushState(state: unknown, _title: string, url: string) {
      stack.splice(index + 1);
      stack.push({ state, url });
      index = stack.length - 1;
    },
    back() {
      if (index > 0) {
        index -= 1;
        for (const h of backHandlers) h();
      }
    },
    replaceState(state: unknown, _title: string, url: string) {
      stack[index] = { state, url };
    },
  };

  return {
    history,
    onPopState(handler: () => void) {
      backHandlers.push(handler);
    },
    stack,
    index: () => index,
  };
}

function withWindowHistory<T>(fn: (mock: ReturnType<typeof createHistoryMock>) => T): T {
  const mock = createHistoryMock();
  const prev = (globalThis as { window?: unknown }).window;
  (globalThis as { window: unknown }).window = {
    history: mock.history,
    location: { href: "http://localhost/page" },
    addEventListener: (type: string, handler: () => void) => {
      if (type === "popstate") mock.onPopState(handler);
    },
    removeEventListener: () => {},
  };
  try {
    return fn(mock);
  } finally {
    if (prev === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prev;
    }
  }
}

__resetOverlayBackStackForTests();

withWindowHistory(() => {
  let closedA = 0;
  let closedB = 0;

  const releaseA = registerOverlayBack(() => {
    closedA += 1;
  }, "modalA");
  assert.equal(getOverlayBackStackDepth(), 1);

  registerOverlayBack(() => {
    closedB += 1;
  }, "modalB");
  assert.equal(getOverlayBackStackDepth(), 2);

  assert.ok(handleOverlayBackPopState());
  assert.equal(closedB, 1);
  assert.equal(closedA, 0);
  assert.equal(getOverlayBackStackDepth(), 1);

  assert.ok(handleOverlayBackPopState());
  assert.equal(closedA, 1);
  assert.equal(getOverlayBackStackDepth(), 0);

  releaseA();
});

__resetOverlayBackStackForTests();

withWindowHistory((mock) => {
  let closed = 0;
  const release = registerOverlayBack(() => {
    closed += 1;
  }, "prog-close");

  assert.equal(getOverlayBackStackDepth(), 1);
  release();
  assert.equal(getOverlayBackStackDepth(), 0);
  assert.equal(closed, 0);

  __setSuppressNextPopForTests(true);
  assert.ok(handleOverlayBackPopState());
  assert.equal(closed, 0);

  mock.history.back();
  assert.equal(closed, 0);
});

__resetOverlayBackStackForTests();

withWindowHistory((mock) => {
  registerOverlayBack(() => {}, "orphan");
  resetOverlayBackStack("test");
  assert.equal(getOverlayBackStackDepth(), 0);

  mock.history.replaceState({ [CAB_OVERLAY_HISTORY_KEY]: 99 }, "", mock.history.state ? "http://localhost/page" : "");
  mock.history.pushState({ [CAB_OVERLAY_HISTORY_KEY]: 99 }, "", "http://localhost/page");
  healOverlayBackStack("test");
  assert.equal(mock.history.state, null);
});

__resetOverlayBackStackForTests();

withWindowHistory(() => {
  attachOverlayBackPopStateListener();
  let closed = 0;
  registerOverlayBack(() => {
    closed += 1;
  }, "listener");

  window.history.back();
  assert.equal(closed, 1);
});

const stackSrc = readFileSync(join(root, "lib/ui/overlay-back-stack.ts"), "utf8");
assert.match(stackSrc, /pushState/);
assert.match(stackSrc, /suppressNextPop/);
assert.match(stackSrc, /handleOverlayBackPopState/);

const shells = [
  "components/gestionale/lavorazioni/lavorazioni-modals.tsx",
  "components/design-system/modal.tsx",
  "components/design-system/drawer.tsx",
  "components/gestionale/gestionale-confirm-dialog.tsx",
  "components/gestionale/mobile-filter-drawer.tsx",
  "components/gestionale/gestionale-unsaved-changes-dialog.tsx",
  "components/gestionale/app-shell.tsx",
];

for (const rel of shells) {
  const src = readFileSync(join(root, rel), "utf8");
  assert.match(src, /useOverlayBackHandler/, `${rel} must wire useOverlayBackHandler`);
}

assert.match(
  readFileSync(join(root, "components/app-providers.tsx"), "utf8"),
  /OverlayBackStackGuard/,
);

assert.match(
  readFileSync(join(root, "lib/ui/use-body-scroll-lock.ts"), "utf8"),
  /resetOverlayBackStack/,
);

console.log("overlay-back-stack.test.ts OK");
