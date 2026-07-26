import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  beginPwaBootstrap,
  bootstrapServiceWorkerUpdateFlow,
  endPwaBootstrap,
  isColdStartSession,
  isNavigationReload,
  isPwaBootstrapPending,
  markPwaSessionActive,
  PWA_SESSION_ACTIVE_KEY,
  settlePendingServiceWorkerInstall,
  subscribeToServiceWorkerUpdates,
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

function mockInstallingWorker(emitter: EventEmitter) {
  let state: ServiceWorkerState = "installing";
  return {
    get state() {
      return state;
    },
    set state(next: ServiceWorkerState) {
      state = next;
    },
    addEventListener(type: string, listener: () => void) {
      emitter.on(type, listener);
    },
    removeEventListener(type: string, listener: () => void) {
      emitter.off(type, listener);
    },
  } as unknown as ServiceWorker;
}

function mockDelayedRegistration() {
  const installEmitter = new EventEmitter();
  const reg = {
    get waiting() {
      return reg._waiting;
    },
    _waiting: null as { postMessage: (msg: unknown) => void } | null,
    get installing() {
      return reg._installing;
    },
    _installing: null as ServiceWorker | null,
    addEventListener(type: string, listener: () => void) {
      if (type === "updatefound") reg._updateFound = listener;
    },
    removeEventListener() {},
    _updateFound: null as (() => void) | null,
    async update() {
      reg._installing = mockInstallingWorker(installEmitter);
      queueMicrotask(() => reg._updateFound?.());
    },
    completeInstall(waiting: { postMessage: (msg: unknown) => void }) {
      installEmitter.emit("statechange");
      if (reg._installing) {
        (reg._installing as unknown as { state: ServiceWorkerState }).state = "installed";
      }
      reg._waiting = waiting;
      reg._installing = null;
      installEmitter.emit("statechange");
    },
    installEmitter,
  };
  return reg;
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

storage.clear();
beginPwaBootstrap(storage);
assert.equal(isPwaBootstrapPending(storage), true);
assert.equal(tryAutoApplyOnColdStart(reg, storage), true);
endPwaBootstrap(storage);
assert.equal(isPwaBootstrapPending(storage), false);
assert.equal(isColdStartSession(storage), false);

async function runAsyncTests(): Promise<void> {
  storage.clear();
  const delayedReg = mockDelayedRegistration();
  const bootstrapMessages: unknown[] = [];
  let notified = false;
  const originalUpdate = delayedReg.update.bind(delayedReg);
  delayedReg.update = async () => {
    await originalUpdate();
    delayedReg.completeInstall({
      postMessage(msg) {
        bootstrapMessages.push(msg);
      },
    });
  };

  const bootstrapResult = await bootstrapServiceWorkerUpdateFlow(
    delayedReg as unknown as ServiceWorkerRegistration,
    () => {
      notified = true;
    },
    0,
    storage,
  );
  assert.equal(bootstrapResult, null, "cold start with async install must auto-apply");
  assert.equal(bootstrapMessages.length, 1);
  assert.equal(notified, false);
  assert.equal(isColdStartSession(storage), true);

  storage.clear();
  const settleReg = mockDelayedRegistration();
  void settleReg.update();
  queueMicrotask(() => {
    settleReg.completeInstall({ postMessage() {} });
  });
  await settlePendingServiceWorkerInstall(settleReg as unknown as ServiceWorkerRegistration, 100);
  assert.ok(settleReg._waiting, "settle must wait for async install to finish");

  storage.clear();
  markPwaSessionActive(storage);
  notified = false;
  const warmReg = mockDelayedRegistration();
  const originalNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      serviceWorker: { controller: {} },
    },
  });

  subscribeToServiceWorkerUpdates(
    warmReg as unknown as ServiceWorkerRegistration,
    () => {
      notified = true;
    },
    { subscribedAtMs: performance.now() - 5_000, storage },
  );

  await warmReg.update();
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  warmReg.completeInstall({ postMessage() {} });

  assert.equal(notified, true, "warm session must notify after bootstrap window");

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: originalNavigator,
  });
}

void runAsyncTests().then(() => {
  console.log("sw-update.test.ts OK");
});
