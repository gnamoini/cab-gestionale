import assert from "node:assert/strict";
import {
  applyServiceWorkerUpdate,
  bootstrapServiceWorkerUpdateFlow,
  markPwaSessionActive,
  PWA_SESSION_ACTIVE_KEY,
  refreshServiceWorkerUpdateCheck,
} from "@/lib/pwa/sw-update";
import {
  registerPwaUpdateGuard,
  resetPwaUpdateGuardsForTests,
} from "@/lib/pwa/pwa-update-guard";

function mockStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

type MockRegistration = ServiceWorkerRegistration & {
  updateCalls: number;
  emitUpdateFound: () => void;
};

function mockRegistration(waiting: ServiceWorker | null): MockRegistration {
  const listeners = new Set<() => void>();
  const registration = {
    waiting,
    installing: null,
    updateCalls: 0,
    addEventListener(type: string, listener: () => void) {
      if (type === "updatefound") listeners.add(listener);
    },
    removeEventListener(type: string, listener: () => void) {
      if (type === "updatefound") listeners.delete(listener);
    },
    emitUpdateFound() {
      for (const listener of listeners) listener();
    },
    async update() {
      registration.updateCalls += 1;
    },
  } as unknown as MockRegistration;
  return registration;
}

const originalNavigator = globalThis.navigator;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { serviceWorker: { controller: {} } },
});

async function runTests(): Promise<void> {
  const coldStorage = mockStorage();
  const coldMessages: unknown[] = [];
  const coldRegistration = mockRegistration({
    postMessage(message: unknown) {
      coldMessages.push(message);
    },
  } as ServiceWorker);

  const coldUnsubscribe = await bootstrapServiceWorkerUpdateFlow(
    coldRegistration,
    () => {
      throw new Error("cold bootstrap must not show the update banner");
    },
    performance.now() - 5_000,
    coldStorage,
  );

  assert.equal(coldRegistration.updateCalls, 1);
  assert.equal(coldMessages.length, 0, "cold bootstrap must not send SKIP_WAITING");
  assert.equal(coldStorage.getItem(PWA_SESSION_ACTIVE_KEY), "1");
  coldUnsubscribe?.();

  const warmStorage = mockStorage();
  markPwaSessionActive(warmStorage);
  const warmMessages: unknown[] = [];
  const warmRegistration = mockRegistration({
    postMessage(message: unknown) {
      warmMessages.push(message);
    },
  } as ServiceWorker);
  let warmNotified = false;

  const warmUnsubscribe = await bootstrapServiceWorkerUpdateFlow(
    warmRegistration,
    () => {
      warmNotified = true;
    },
    performance.now() - 5_000,
    warmStorage,
  );

  assert.equal(warmNotified, true, "warm bootstrap must surface an existing waiting worker");
  assert.equal(warmMessages.length, 0, "warm bootstrap must not auto-apply");
  warmUnsubscribe?.();

  const applyMessages: unknown[] = [];
  const applyRegistration = mockRegistration({
    postMessage(message: unknown) {
      applyMessages.push(message);
    },
  } as ServiceWorker);
  assert.equal(applyServiceWorkerUpdate(applyRegistration), true);
  assert.equal(applyMessages.length, 1);

  const unregisterDirtyGuard = registerPwaUpdateGuard({
    id: "dirty-form",
    isDirty: () => true,
  });
  const blockedMessages: unknown[] = [];
  const blockedRegistration = mockRegistration({
    postMessage(message: unknown) {
      blockedMessages.push(message);
    },
  } as ServiceWorker);
  assert.equal(applyServiceWorkerUpdate(blockedRegistration), false);
  assert.equal(blockedMessages.length, 0, "dirty guard must block SKIP_WAITING");
  unregisterDirtyGuard();
  resetPwaUpdateGuardsForTests();

  const noUpdateRegistration = mockRegistration(null);
  await refreshServiceWorkerUpdateCheck(noUpdateRegistration, performance.now());
  assert.equal(noUpdateRegistration.updateCalls, 0, "bootstrap window must suppress immediate runtime checks");

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: originalNavigator,
  });

  console.log("sw-update.test.ts OK");
}

void runTests();
