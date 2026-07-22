import assert from "node:assert/strict";
import {
  isColdStartSession,
  isNavigationReload,
  markPwaSessionActive,
  PWA_SESSION_ACTIVE_KEY,
  tryAutoApplyOnColdStart,
} from "@/lib/pwa/sw-update";

function mockStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

function mockRegistration(waiting: { postMessage: (msg: unknown) => void } | null) {
  return { waiting } as unknown as ServiceWorkerRegistration;
}

const storage = mockStorage();
assert.equal(isColdStartSession(storage), true);

markPwaSessionActive(storage);
assert.equal(isColdStartSession(storage), false);
assert.equal(storage.getItem(PWA_SESSION_ACTIVE_KEY), "1");

storage.clear();
const messages: unknown[] = [];
const reg = mockRegistration({
  postMessage(msg) {
    messages.push(msg);
  },
});
assert.equal(tryAutoApplyOnColdStart(reg, storage), true);
assert.equal(messages.length, 1);

storage.clear();
markPwaSessionActive(storage);
messages.length = 0;
assert.equal(tryAutoApplyOnColdStart(reg, storage), false);
assert.equal(messages.length, 0);

storage.clear();
assert.equal(tryAutoApplyOnColdStart(mockRegistration(null), storage), false);

const originalGetEntriesByType = performance.getEntriesByType.bind(performance);
performance.getEntriesByType = ((type: string) => {
  if (type === "navigation") {
    return [{ type: "reload" }] as unknown as PerformanceEntryList;
  }
  return originalGetEntriesByType(type);
}) as typeof performance.getEntriesByType;

markPwaSessionActive(storage);
messages.length = 0;
assert.equal(isNavigationReload(), true);
assert.equal(tryAutoApplyOnColdStart(reg, storage), true);
assert.equal(messages.length, 1);

performance.getEntriesByType = originalGetEntriesByType;

console.log("sw-update.test.ts OK");
