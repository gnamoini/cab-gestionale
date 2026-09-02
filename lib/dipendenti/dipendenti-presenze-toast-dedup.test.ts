import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dipendentiPresenzeToastStorageKey,
  hasDipendentiPresenzeToastBeenShown,
  markDipendentiPresenzeToastShown,
} from "@/lib/dipendenti/dipendenti-presenze-toast-dedup";

test("dipendenti presenze toast storage key includes user and date", () => {
  assert.equal(
    dipendentiPresenzeToastStorageKey("user-a", "2026-09-02"),
    "dip-pres-toast:user-a:2026-09-02",
  );
});

test("dipendenti presenze toast dedup per user/day in localStorage", () => {
  const storage = new Map<string, string>();
  const originalWindow = (globalThis as { window?: Window }).window;
  (globalThis as { window?: Window }).window = {
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, v);
      },
      removeItem: (k: string) => {
        storage.delete(k);
      },
      clear: () => storage.clear(),
      key: () => null,
      length: 0,
    },
  } as unknown as Window;

  try {
    assert.equal(hasDipendentiPresenzeToastBeenShown("user-b", "2026-09-02"), false);
    markDipendentiPresenzeToastShown("user-b", "2026-09-02");
    assert.equal(hasDipendentiPresenzeToastBeenShown("user-b", "2026-09-02"), true);
    assert.equal(hasDipendentiPresenzeToastBeenShown("user-c", "2026-09-02"), false);
  } finally {
    (globalThis as { window?: Window }).window = originalWindow;
  }
});
