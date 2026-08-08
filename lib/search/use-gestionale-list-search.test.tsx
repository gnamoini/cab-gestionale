/**
 * @vitest-environment jsdom
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.document = dom.window.document;
globalThis.window = dom.window as Window & typeof globalThis;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;

import assert from "node:assert/strict";
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  GESTIONALE_SEARCH_DEBOUNCE_MS,
  useGestionaleListSearch,
} from "@/lib/search/use-gestionale-list-search";

async function main() {
  function mountHook<T>(renderFn: () => T): { get: () => T; unmount: () => void } {
    let latest!: T;
    const container = document.createElement("div");
    const root = createRoot(container);

    function Probe() {
      latest = renderFn();
      return null;
    }

    act(() => {
      root.render(<Probe />);
    });

    return {
      get: () => latest,
      unmount: () => {
        act(() => root.unmount());
      },
    };
  }

  async function flushDebounce(ms: number) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, ms + 5));
    });
  }

  assert.equal(GESTIONALE_SEARCH_DEBOUNCE_MS, 250);

  const fast = mountHook(() => useGestionaleListSearch({ debounceMs: 200 }));
  act(() => {
    fast.get().setSearchInput("C");
    fast.get().setSearchInput("CE");
    fast.get().setSearchInput("CEREBA");
  });
  assert.equal(fast.get().searchApplied, "");
  await flushDebounce(200);
  assert.equal(fast.get().searchApplied, "CEREBA");
  fast.unmount();

  const slow = mountHook(() => useGestionaleListSearch({ debounceMs: 200 }));
  act(() => slow.get().setSearchInput("A"));
  await flushDebounce(200);
  assert.equal(slow.get().searchApplied, "A");
  act(() => slow.get().setSearchInput("AB"));
  await flushDebounce(200);
  assert.equal(slow.get().searchApplied, "AB");
  slow.unmount();

  const enter = mountHook(() => useGestionaleListSearch({ debounceMs: 300 }));
  act(() => {
    enter.get().setSearchInput("typing");
    enter.get().flushSearch();
  });
  assert.equal(enter.get().searchApplied, "typing");
  enter.unmount();

  const clear = mountHook(() => useGestionaleListSearch({ debounceMs: 200 }));
  act(() => clear.get().setSearchInput("x"));
  await flushDebounce(200);
  assert.equal(clear.get().searchApplied, "x");
  act(() => clear.get().clearSearch());
  assert.equal(clear.get().searchApplied, "");
  clear.unmount();

  const rapidClear = mountHook(() => useGestionaleListSearch({ debounceMs: 200 }));
  act(() => rapidClear.get().setSearchInput("abc"));
  act(() => rapidClear.get().clearSearch());
  await flushDebounce(200);
  assert.equal(rapidClear.get().searchApplied, "");
  rapidClear.unmount();

  for (const ms of [200, 250, 300]) {
    const probe = mountHook(() => useGestionaleListSearch({ debounceMs: ms }));
    act(() => {
      probe.get().setSearchInput("a");
      probe.get().setSearchInput("ab");
      probe.get().setSearchInput("abc");
    });
    await flushDebounce(ms);
    assert.equal(probe.get().searchApplied, "abc");
    probe.unmount();
  }

  console.log("use-gestionale-list-search.test.tsx OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
