import assert from "node:assert/strict";
import {
  pushSelectorRecent,
  readSelectorRecents,
} from "@/lib/selector-core/selector-recents-store";

const LIST_KEY = "__test_selector_recents__";

function withMockStorage(run: () => void): void {
  const store = new Map<string, string>();
  const g = globalThis as typeof globalThis & { window?: typeof globalThis.window };
  const prev = g.window;
  g.window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    },
  } as unknown as typeof globalThis.window;
  try {
    run();
  } finally {
    g.window = prev;
  }
}

withMockStorage(() => {
  pushSelectorRecent(LIST_KEY, "Alpha");
  pushSelectorRecent(LIST_KEY, "alpha");
  const once = readSelectorRecents(LIST_KEY);
  assert.equal(once.length, 1);
  assert.equal(once[0], "alpha");

  pushSelectorRecent(LIST_KEY, "Beta");
  pushSelectorRecent(LIST_KEY, "Beta");
  pushSelectorRecent(LIST_KEY, "Beta");
  const deduped = readSelectorRecents(LIST_KEY);
  assert.equal(deduped[0], "Beta");
  assert.equal(deduped.filter((v) => v === "Beta").length, 1);
});

console.log("selector-recents-store.test.ts OK");
